import pytest

from federated_collection_discovery.free_text import (
    parse_query_for_cmr,
)


def test_cmr_single_term():
    query = "climate"
    cmr_queries = parse_query_for_cmr(query)
    assert cmr_queries == [query]


def test_cmr_comma_or():
    query = "climate,model,uncertainty"
    cmr_queries = parse_query_for_cmr(query)
    assert set(cmr_queries) == set(["climate", "model", "uncertainty"])


def test_cmr_parentheses():
    query = "(quick AND brown) OR (fast AND red)"
    with pytest.raises(ValueError):
        parse_query_for_cmr(query)
    # assert set(cmr_queries) == set(["quick brown", "fast red"])


def test_cmr_exact():
    query = '"climate change","global warming"'
    cmr_queries = parse_query_for_cmr(query)
    assert set(cmr_queries) == set(['"climate change"', '"global warming"'])


def test_cmr_default_and():
    query = "climate change model temperature"
    cmr_queries = parse_query_for_cmr(query)
    assert cmr_queries == [query]


def test_cmr_keyword_and_phrase():
    query = '"climate model" temperature'
    cmr_queries = parse_query_for_cmr(query)
    assert set(cmr_queries) == set(['"climate model"', "temperature"])


def test_cmr_and_parentheses():
    query = "climate AND (warming OR cooling)"
    with pytest.raises(ValueError):
        parse_query_for_cmr(query)
    # assert set(cmr_queries) == set(["climate warming", "climate cooling"])
