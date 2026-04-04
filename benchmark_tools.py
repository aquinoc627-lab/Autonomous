import time
from backend.app.api.tools import list_categories
from backend.app.core.tool_registry import TOOL_REGISTRY
import backend.app.api.tools as api_tools
import asyncio

async def run_benchmark():
    global TOOL_REGISTRY
    original_registry = TOOL_REGISTRY.copy()

    try:
        import backend.app.core.tool_registry as tr

        # Test original N+1 implementation scaling
        scale = 1000
        expanded_registry = original_registry * scale

        # To simulate O(C*N) accurately, we also need to scale the categories proportionally,
        # or just realize that the original implementation uses get_categories() which returns a SET of categories,
        # and then iterates through the ENTIRE registry for EACH category.
        # Wait, if we just multiply the list, the number of categories remains the SAME (10).
        # So original implementation: C categories (10), N tools. C * N iterations = 10 * N.
        # It's an O(N) operation, just with a constant factor of C.

        # Wait, get_tools_by_category iterates over the WHOLE registry.
        # So for C categories, it does C full passes over N items.
        # Since C is 10, it does 10 * N iterations.

        # The new implementation does 1 full pass over N items.
        # So it's 10x faster theoretically. Let's see if we can measure this.

        tr.TOOL_REGISTRY = expanded_registry
        api_tools.TOOL_REGISTRY = expanded_registry

        print(f"Benchmarking with {len(tr.TOOL_REGISTRY)} tools...")

        start = time.time()
        for _ in range(100):
            await list_categories(current_user=None)
        end = time.time()

        print(f"Optimized Time (1 pass): {end - start:.4f} seconds")

    finally:
        tr.TOOL_REGISTRY = original_registry
        api_tools.TOOL_REGISTRY = original_registry

if __name__ == "__main__":
    asyncio.run(run_benchmark())
