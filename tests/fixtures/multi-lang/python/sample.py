"""Sample Python module covering features the AST analyzer should extract.

Used by `tests/utils/ast-analyzer.test.ts` (issue #112) to verify the
tree-sitter-python extractor pulls functions, classes, methods, parameters,
type hints, decorators, async-ness, and imports correctly.
"""

import os
import sys as system
from collections import OrderedDict, defaultdict
from typing import List, Optional


CONSTANT_GREETING: str = "hello"


def greet(name: str, *, polite: bool = True) -> str:
    """Return a greeting using the given name."""
    if polite:
        return f"Hello, {name}!"
    return f"hi {name}"


async def fetch_user(user_id: int, timeout: float = 5.0) -> Optional[dict]:
    """Fetch a user record asynchronously.

    Returns None if the user does not exist.
    """
    return None


def _internal_helper(values: List[int]) -> int:
    return sum(values)


class Animal:
    """Base class for living things."""

    legs: int = 4

    def __init__(self, name: str) -> None:
        self.name = name

    def speak(self) -> str:
        """Return the noise this animal makes."""
        return "..."

    def _sniff(self) -> None:
        return None


class Dog(Animal):
    """A friendlier subtype of Animal."""

    def __init__(self, name: str, breed: str = "mutt") -> None:
        super().__init__(name)
        self.breed = breed

    def speak(self) -> str:
        return "woof"

    async def fetch(self, item: str) -> bool:
        return True
