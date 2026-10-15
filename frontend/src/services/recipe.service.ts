import { api } from './api';
import { readSSE } from './sse';
import type {
  PaginatedResponse,
  Recipe,
  RecipeFacets,
  RecipeFeedback,
  RecipeFeedbackResponse,
  RecipeGenerationRequest,
  RecipeStreamEvent,
  StreamError,
} from '../types';

const STREAM_EVENTS = new Set<RecipeStreamEvent['event']>([
  'stage',
  'thinking',
  'draft',
  'complete',
  'error',
  'ping',
]);

/** Failure of the stream transport itself (HTTP error, dropped connection, missing auth). */
export class RecipeStreamError extends Error implements StreamError {
  readonly retryable: boolean;
  readonly status?: number;

  constructor(message: string, retryable: boolean, status?: number) {
    super(message);
    this.name = 'RecipeStreamError';
    this.retryable = retryable;
    this.status = status;
  }
}

/** True for fetch/stream aborts, including `DOMException`s from another realm. */
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

export interface StreamRecipeOptions {
  signal?: AbortSignal;
  onEvent: (event: RecipeStreamEvent) => void;
}

export interface RecipeListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  tags?: string[];
  cuisine?: string;
  /** Only recipes the user liked or rated 4+. */
  favorites?: boolean;
  sort?: 'created_at' | 'name' | 'total_minutes';
  order?: 'asc' | 'desc';
}

async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const text = await response.text();
    if (!text) {
      return null;
    }
    try {
      const body = JSON.parse(text) as { detail?: unknown };
      return typeof body.detail === 'string' ? body.detail : null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

async function toHttpError(response: Response): Promise<RecipeStreamError> {
  const detail = await readErrorDetail(response);
  switch (response.status) {
    case 401:
      return new RecipeStreamError('Your session has expired. Please log in again.', false, 401);
    case 422:
      return new RecipeStreamError(
        detail ?? 'Some of the recipe options are invalid.',
        false,
        response.status
      );
    case 429:
      return new RecipeStreamError(
        detail ?? 'Too many requests. Wait a moment and try again.',
        true,
        response.status
      );
    case 503:
      return new RecipeStreamError(
        detail ?? 'Recipe generation is unavailable right now.',
        false,
        response.status
      );
    default:
      return new RecipeStreamError(
        detail ?? `Recipe generation failed (HTTP ${response.status}).`,
        response.status >= 500,
        response.status
      );
  }
}

function parseStreamEvent(event: string, data: string): RecipeStreamEvent | null {
  if (!STREAM_EVENTS.has(event as RecipeStreamEvent['event'])) {
    return null;
  }
  try {
    return { event, data: JSON.parse(data) } as RecipeStreamEvent;
  } catch {
    return null;
  }
}

class RecipeService {
  /**
   * Run `POST /recipes/generate/stream` and report each v2 event through `onEvent`.
   *
   * Resolves after a terminal `complete` or `error` event. Rejects with `RecipeStreamError`
   * for transport failures, or with the fetch `AbortError` when `signal` aborts.
   */
  async streamRecipe(
    request: RecipeGenerationRequest,
    { signal, onEvent }: StreamRecipeOptions
  ): Promise<void> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new RecipeStreamError('You need to log in to generate recipes.', false, 401);
    }

    let response: Response;
    try {
      response = await fetch(`${api.defaults.baseURL}/recipes/generate/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
        signal,
      });
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) {
        throw error;
      }
      throw new RecipeStreamError('Could not reach the server. Check your connection.', true);
    }

    if (!response.ok) {
      throw await toHttpError(response);
    }
    if (!response.body) {
      throw new RecipeStreamError('The server sent an empty response.', true);
    }

    try {
      for await (const message of readSSE(response.body)) {
        const event = parseStreamEvent(message.event, message.data);
        if (!event) {
          continue;
        }
        onEvent(event);
        if (event.event === 'complete' || event.event === 'error') {
          return;
        }
      }
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) {
        throw error;
      }
      throw new RecipeStreamError('The connection was interrupted. Please try again.', true);
    }

    if (signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }
    throw new RecipeStreamError('The connection closed before the recipe was finished.', true);
  }

  async getRecipes(skip = 0, limit = 20): Promise<Recipe[]> {
    const response = await api.get<Recipe[]>('/recipes/', { params: { skip, limit } });
    return response.data;
  }

  async getRecipe(id: number): Promise<Recipe> {
    const response = await api.get<Recipe>(`/recipes/${id}`);
    return response.data;
  }

  async getRecipesPaginated(params: RecipeListParams): Promise<PaginatedResponse<Recipe>> {
    const response = await api.get<PaginatedResponse<Recipe>>('/recipes/list', {
      params: {
        page: params.page ?? 1,
        page_size: params.pageSize ?? 12,
        q: params.q || undefined,
        tags: params.tags && params.tags.length > 0 ? params.tags : undefined,
        cuisine: params.cuisine || undefined,
        favorites: params.favorites || undefined,
        sort: params.sort ?? 'created_at',
        order: params.order ?? 'desc',
      },
    });
    return response.data;
  }

  /** Cuisine and tag counts across all of the user's recipes, for filter chips. */
  async getFacets(): Promise<RecipeFacets> {
    const response = await api.get<RecipeFacets>('/recipes/facets');
    return response.data;
  }

  async updateRecipe(id: number, updates: Partial<Recipe>): Promise<Recipe> {
    const response = await api.put<Recipe>(`/recipes/${id}`, updates);
    return response.data;
  }

  async deleteRecipe(id: number): Promise<void> {
    await api.delete(`/recipes/${id}`);
  }

  /** The current user's feedback for a recipe, or `null` if they haven't left any. */
  async getFeedback(recipeId: number): Promise<RecipeFeedbackResponse | null> {
    const response = await api.get<RecipeFeedbackResponse | null>(`/recipes/${recipeId}/feedback`);
    return response.data ?? null;
  }

  async addFeedback(recipeId: number, feedback: RecipeFeedback): Promise<RecipeFeedbackResponse> {
    const response = await api.post<RecipeFeedbackResponse>(
      `/recipes/${recipeId}/feedback`,
      feedback
    );
    return response.data;
  }

  async deleteFeedback(recipeId: number): Promise<void> {
    await api.delete(`/recipes/${recipeId}/feedback`);
  }
}

export default new RecipeService();
