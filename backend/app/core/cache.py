"""
Caching utilities for reducing API calls and token usage
"""

import hashlib
import json
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import redis
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


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
                if cached and cached["expires_at"] > datetime.utcnow():
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
                    "expires_at": datetime.utcnow() + timedelta(hours=ttl_hours),
                }
        except Exception as e:
            logger.warning(f"Cache set error: {e}")

    def clear_expired(self):
        """Clear expired entries from in-memory cache"""
        if not self.use_redis:
            now = datetime.utcnow()
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
