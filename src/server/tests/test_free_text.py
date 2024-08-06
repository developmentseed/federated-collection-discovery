import pytest

from app.free_text import (
    parse_query_for_cmr,
    sqlite_text_search,
)


def test_sqlite_single_term():
    query = "sentinel"
    assert sqlite_text_search(query, {"description": "The sentinel node was true"})
    assert not sqlite_text_search(query, {"description": "No match here"})


def test_sqlite_exact_phrase():
    query = '"climate model"'
    assert sqlite_text_search(query, {"description": "The climate model is impressive"})
    assert not sqlite_text_search(
        query, {"description": "This model is for climate modeling"}
    )

    # an exact phrase with a comma inside
    query = '"models, etc"'
    assert sqlite_text_search(
        query, {"description": "Produced with equations, and models, etc."}
    )
    assert not sqlite_text_search(query, {"description": "Produced with models"})


def test_sqlite_and_terms_default():
    query = "climate model"
    assert sqlite_text_search(
        query,
        {
            "description": "Climate change is a significant challenge",
            "keywords": "model, prediction",
        },
    )
    assert sqlite_text_search(
        query, {"description": "The model was developed using climate observation data"}
    )
    assert not sqlite_text_search(query, {"description": "This is an advanced model"})
    assert not sqlite_text_search(query, {"description": "No relevant terms here"})


def test_sqlite_or_terms_explicit():
    query = "climate OR model"
    assert sqlite_text_search(query, {"description": "Climate discussion"})
    assert sqlite_text_search(query, {"description": "FPGA model creation"})
    assert not sqlite_text_search(query, {"description": "No matching term here"})


def test_sqlite_or_terms_commas():
    query = "climate,model"
    assert sqlite_text_search(query, {"description": "Climate change is here"})
    assert sqlite_text_search(query, {"description": "They built a model train"})
    assert sqlite_text_search(query, {"description": "It's a climate model!"})
    assert not sqlite_text_search(
        query, {"description": "It's a mathematical equation"}
    )


def test_sqlite_and_terms():
    query = "climate AND model"
    assert sqlite_text_search(query, {"description": "The climate model is impressive"})
    assert not sqlite_text_search(
        query, {"description": "This climate change discussion"}
    )
    assert not sqlite_text_search(query, {"description": "Advanced model system"})


def test_sqlite_parentheses_grouping():
    query = "(quick OR brown) AND fox"
    assert sqlite_text_search(query, {"description": "The quick brown fox"})
    assert sqlite_text_search(query, {"description": "A quick fox jumps"})
    assert sqlite_text_search(query, {"description": "brown bear and a fox"})
    assert not sqlite_text_search(query, {"description": "The fox is clever"})

    query = "(quick AND brown) OR (fast AND red)"
    assert sqlite_text_search(query, {"description": "quick brown fox"})
    assert sqlite_text_search(query, {"description": "fast red car"})
    assert not sqlite_text_search(query, {"description": "quick red car"})


def test_sqlite_inclusions_exclusions():
    query = "quick +brown -fox"
    assert sqlite_text_search(query, {"description": "The quick brown bear"})
    assert not sqlite_text_search(query, {"description": "The quick fox"})
    assert not sqlite_text_search(query, {"description": "The quickest"})
    assert sqlite_text_search(query, {"description": "A quick light brown jumper"})


def test_sqlite_partial_match():
    query = "climat"
    assert not sqlite_text_search(query, {"description": "climatology"})
    assert not sqlite_text_search(query, {"description": "climate"})
    assert not sqlite_text_search(query, {"description": "climbing"})


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
