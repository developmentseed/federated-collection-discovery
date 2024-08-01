import pytest

from app.free_text import apply_regex, parse_query_for_cmr, parse_query_for_ogc


def test_ogc_single_term():
    query = "sentinel"
    regex = parse_query_for_ogc(query)
    assert apply_regex(regex, "The sentinel node was true")
    assert not apply_regex(regex, "No match here")


def test_ogc_exact_phrase():
    query = '"climate model"'
    regex = parse_query_for_ogc(query)
    assert apply_regex(regex, "The climate model is impressive")
    assert not apply_regex(regex, "This model is for climate modeling")

    # an exact phrase with a comma inside
    query = '"models, etc"'
    regex = parse_query_for_ogc(query)
    assert apply_regex(regex, "Produced with equations, and models, etc.")
    assert not apply_regex(regex, "Produced with models")


def test_ogc_and_terms_default():
    query = "climate model"
    regex = parse_query_for_ogc(query)
    assert apply_regex(regex, "Climate change is a significant modeling challenge")
    assert apply_regex(regex, "The model was developed using climate observation data")
    assert not apply_regex(regex, "This is an advanced model")
    assert not apply_regex(regex, "No relevant terms here")


def test_ogc_or_terms_explicit():
    query = "climate OR model"
    regex = parse_query_for_ogc(query)
    assert apply_regex(regex, "Climate discussion")
    assert apply_regex(regex, "FPGA model creation")
    assert not apply_regex(regex, "No matching term here")


def test_ogc_or_terms_commas():
    query = "climate,model"
    regex = parse_query_for_ogc(query)
    assert apply_regex(regex, "Climate change is here")
    assert apply_regex(regex, "They built a model train")
    assert apply_regex(regex, "It's a climate model!")
    assert not apply_regex(regex, "It's a mathematical equation")


def test_ogc_and_terms():
    query = "climate AND model"
    regex = parse_query_for_ogc(query)
    assert apply_regex(regex, "The climate model is impressive")
    assert not apply_regex(regex, "This climate change discussion")
    assert not apply_regex(regex, "Advanced model system")


def test_ogc_parentheses_grouping():
    query = "(quick OR brown) AND fox"
    regex = parse_query_for_ogc(query)
    assert apply_regex(regex, "The quick brown fox")
    assert apply_regex(regex, "A quick fox jumps")
    assert apply_regex(regex, "brown bear and a fox")
    assert not apply_regex(regex, "The fox is clever")

    query = "(quick AND brown) OR (fast AND red)"
    regex = parse_query_for_ogc(query)
    assert apply_regex(regex, "quick brown fox")
    assert apply_regex(regex, "fast red car")
    assert not apply_regex(regex, "quick red car")


def test_ogc_inclusions_exclusions():
    query = "quick +brown -fox"
    regex = parse_query_for_ogc(query)
    assert apply_regex(regex, "The quick brown bear")
    assert not apply_regex(regex, "The quick fox")
    assert not apply_regex(regex, "The quickest")
    assert apply_regex(regex, "A quick light brown jumper")


def test_ogc_partial_match():
    query = "climat"
    regex = parse_query_for_ogc(query)
    assert apply_regex(regex, "climatology")
    assert apply_regex(regex, "climate")
    assert not apply_regex(regex, "climbing")


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
