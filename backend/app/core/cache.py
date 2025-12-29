"""
Caching utilities for reducing API calls and token usage
"""

import hashlib
import json
from typing import Optional, Dict, Any, TypeVar, Generic
from datetime import datetime, timedelta, timezone
import redis
from app.core.config import settings
import logging
import time

logger = logging.getLogger(__name__)

T = TypeVar("T")


class Cache(Generic[T]):
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Cache, cls).__new__(cls)
            cls._instance._cache: dict[str, dict[str, str | int | float]] = {}
        return cls._instance

    def _generate_cache_key(
        self, prefix: str, params: dict[str, str | int | float | bool | None]
    ) -> str:
        """Generate a consistent cache key"""
        param_str = json.dumps(params, sort_keys=True)
        return f"{prefix}:{hashlib.md5(param_str.encode()).hexdigest()}"

    def get(
        self, prefix: str, params: dict[str, str | int | float | bool | None]
    ) -> T | None:
        """Get data from cache if it exists and is not expired"""
        key = self._generate_cache_key(prefix, params)
        cached_item = self._cache.get(key)

        if cached_item:
            if time.time() < cached_item["expires_at"]:
                return cached_item["data"]
            else:
                # Expired, remove from cache
                del self._cache[key]
        return None

    def set(
        self,
        prefix: str,
        params: dict[str, str | int | float | bool | None],
        data: T,
        ttl_hours: int = 24,
    ):
        """Set data in the cache with a TTL"""
        key = self._generate_cache_key(prefix, params)
        expires_at = time.time() + ttl_hours * 3600
        self._cache[key] = {"data": data, "expires_at": expires_at}

    def clear(self):
        """Clear the entire cache"""
        self._cache.clear()


# Global cache instance
cache_manager = Cache()


# --- Specific Caching Functions ---


def get_cached_or_generate(
    prefix: str,
    params: dict[str, str | int | float | bool | None],
    generator_func,
    ttl_hours: int = 24,
) -> T:
    """
    Decorator to cache the result of a function call.
    Uses a simple in-memory cache with a TTL.
    """
    cached_data = cache_manager.get(prefix, params)
    if cached_data is not None:
        return cached_data

    new_data = generator_func()
    cache_manager.set(prefix, params, new_data, ttl_hours)
    return new_data


def should_use_cache(params: dict[str, str | int | float | bool | None]) -> bool:
    """
    Determine if cache should be used based on request parameters.
    For example, don't cache if there are very specific, unique constraints.
    """
    # Example: Don't cache if there are many ingredients to include/avoid
    if len(params.get("ingredients_to_use", [])) > 5:
        return False
    if len(params.get("ingredients_to_avoid", [])) > 5:
        return False
    return True


class APIResponseCache:
    """Cache for storing API responses to reduce token usage"""

    def __init__(self):
        # Use Redis for production, in-memory dict for development
        self.use_redis = hasattr(settings, "REDIS_URL") and settings.REDIS_URL

        if self.use_redis:
            self.redis_client = redis.from_url(settings.REDIS_URL)
        else:
            # Simple in-memory cache for development
            self._cache: Dict[str, Dict[str, Any]] = {}

    def _generate_cache_key(self, prefix: str, params: Dict[str, Any]) -> str:
        """Generate a cache key from parameters"""
        # Sort params for consistent hashing
        sorted_params = json.dumps(params, sort_keys=True)
        param_hash = hashlib.md5(sorted_params.encode()).hexdigest()
        return f"{prefix}:{param_hash}"

    def get(self, prefix: str, params: Dict[str, Any]) -> Optional[Any]:
        """Get cached response"""
        cache_key = self._generate_cache_key(prefix, params)

        try:
            if self.use_redis:
                cached = self.redis_client.get(cache_key)
                if cached:
                    return json.loads(cached)
            else:
                cached = self._cache.get(cache_key)
                if cached and cached["expires_at"] > datetime.now(timezone.utc):
                    return cached["data"]
        except Exception as e:
            logger.warning(f"Cache get error: {e}")

        return None

    def set(self, prefix: str, params: Dict[str, Any], data: Any, ttl_hours: int = 24):
        """Set cached response"""
        cache_key = self._generate_cache_key(prefix, params)

        try:
            if self.use_redis:
                self.redis_client.setex(
                    cache_key, timedelta(hours=ttl_hours), json.dumps(data)
                )
            else:
                self._cache[cache_key] = {
                    "data": data,
                    "expires_at": datetime.now(timezone.utc)
                    + timedelta(hours=ttl_hours),
                }
        except Exception as e:
            logger.warning(f"Cache set error: {e}")

    def clear_expired(self):
        """Clear expired entries from in-memory cache"""
        if not self.use_redis:
            now = datetime.now(timezone.utc)
            expired_keys = [
                key for key, value in self._cache.items() if value["expires_at"] <= now
            ]
            for key in expired_keys:
                del self._cache[key]


# Global cache instance
api_cache = APIResponseCache()


class CachedMealPlanningAgent:
    """Wrapper for meal planning agent with caching"""

    @staticmethod
    def get_cache_params(
        meal_type: str,
        servings: int,
        difficulty: str,
        preferred_cuisines: list,
        dietary_restrictions: list,
        must_include_ingredients: list,
        must_avoid_ingredients: list,
    ) -> Dict[str, Any]:
        """Create cacheable parameters"""
        return {
            "meal_type": meal_type,
            "servings": servings,
            "difficulty": difficulty,
            "cuisines": sorted(preferred_cuisines) if preferred_cuisines else [],
            "restrictions": sorted(dietary_restrictions)
            if dietary_restrictions
            else [],
            "include": sorted(must_include_ingredients)
            if must_include_ingredients
            else [],
            "avoid": sorted(must_avoid_ingredients) if must_avoid_ingredients else [],
        }

    @staticmethod
    def should_use_cache(params: Dict[str, Any]) -> bool:
        """Determine if we should use cache for these parameters"""
        # Cache simple queries without specific ingredients
        return len(params.get("include", [])) == 0 and len(params.get("avoid", [])) <= 2
