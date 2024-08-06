"""Free-text search as described in OGC API - Features - Part 9: Text Search
https://docs.ogc.org/DRAFTS/24-031.html#q-parameter

That is the SPEC that the collection-search STAC API extension is meant to follow,
but there are some inconsistencies in the described examples regarding spaces
and whether they should represent OR or AND clauses!

https://github.com/stac-api-extensions/freetext-search/blob/master/README.md#http-get

This implementation respects the OGC API spec and treats spaces as AND clauses.
"""

import re
from typing import List


def escape_regex(term):
    return re.escape(term)


def handle_exact_phrase(phrase):
    # Match exact phrase including spaces
    return r"\b{}\b".format(re.escape(phrase.strip('"')))


def handle_or_terms(terms):
    # Match any one of the terms
    return "|".join(map(escape_regex, terms))


def handle_inclusion_exclusion(token):
    if token.startswith("+"):
        term = token[1:]
        return r"(?=.*\b{}\b)".format(escape_regex(term))
    elif token.startswith("-"):
        term = token[1:]
        return r"(?!.*\b{}\b)".format(escape_regex(term))
    else:
        return escape_regex(token)


def merge_parts_with_and(tokens):
    # Merging parts ensuring all must match
    return "(?=.*{})".format(")(?=.*".join(tokens))


def parse_query_for_ogc(q):
    regex_parts = []

    # break the query into individual terms, quoted statements, and parentheses
    tokens = [
        token.strip() for token in re.findall(r"\".*?\"|\([^\)]*\)|,|[^,\s]+|\s", q)
    ]

    # track terms that need to be combined in an AND statement
    current_and_terms = []

    for token in tokens:
        if not token:
            continue
        if token == ",":
            token = "OR"
        if token == "AND":
            continue
        elif token == "OR":
            # collect terms that need to be collapsed in an AND statement, continue
            if current_and_terms:
                regex_parts.append(merge_parts_with_and(current_and_terms))
                current_and_terms = []
        elif token.startswith('"') and token.endswith('"'):
            # handle the exact phrase term
            current_and_terms.append(handle_exact_phrase(token))
        elif "(" in token and ")" in token:
            # recursively parse parenthetical statements
            inner_query = token.strip("()")
            current_and_terms.append("({})".format(parse_query_for_ogc(inner_query)))
        elif token.startswith("+") or token.startswith("-"):
            current_and_terms.append(handle_inclusion_exclusion(token))
        else:
            if "AND" in token:
                and_terms = list(map(str.strip, token.split("AND")))
                current_and_terms.append(merge_parts_with_and(and_terms))
            elif "OR" in token:
                or_terms = list(map(str.strip, token.split("OR")))
                regex_parts.append(handle_or_terms(or_terms))
            else:
                current_and_terms.append(escape_regex(token))

    if current_and_terms:
        regex_parts.append(merge_parts_with_and(current_and_terms))

    # Join OR sets (or a single OR-less set)
    regex = "|".join(regex_parts)

    return regex


def apply_regex(regex, text) -> bool:
    """Apply the regex to the given text and return if there's a match."""
    pattern = re.compile(regex, re.IGNORECASE)
    return bool(pattern.search(text))


def parse_query_for_cmr(q) -> List[str]:
    """CMR free-text search cannot handle a mixture of exact terms and phrases,
    cannot handle OR queries. Complex queries must be sent separately and the
    results must be combined appropriately
    """
    separate_or_queries = []

    # break the query into individual terms, quoted statements, and parentheses
    tokens = [
        token.strip() for token in re.findall(r"\".*?\"|\([^\)]*\)|,|[^,\s]+|\s", q)
    ]

    # track terms that need to be combined in an AND statement
    current_and_terms: List[str] = []

    for token in tokens:
        if not token:
            continue
        if token == ",":
            # commas are interpreted as OR statements
            token = "OR"

        if token == "AND":
            continue
        elif token == "OR":
            # collect terms that need to be collapsed in an AND statement, continue
            if current_and_terms:
                separate_or_queries.append(" ".join(current_and_terms))
                current_and_terms = []
        elif token.startswith('"') and token.endswith('"'):
            # handle the exact phrase term
            if current_and_terms:
                separate_or_queries.append(" ".join(current_and_terms))
                current_and_terms = []
            separate_or_queries.append(token)
        elif "(" in token and ")" in token:
            raise ValueError(
                "CMR free-text search does not handle parenthetetical terms "
                f"like {token}\n"
                f"full query: {q}"
            )
        elif token.startswith("+"):
            current_and_terms.append(handle_inclusion_exclusion(token))
        elif token.startswith("-"):
            raise ValueError(
                f"CMR free-text search does not handle exclusion terms like {token}\n"
                f"full query: {q}"
            )
        else:
            if "AND" in token:
                and_terms = list(map(str.strip, token.split("AND")))
                current_and_terms.append(" ".join(and_terms))
            elif "OR" in token:
                or_terms = list(map(str.strip, token.split("OR")))
                separate_or_queries.extend(or_terms)
            else:
                current_and_terms.append(token)

    if current_and_terms:
        separate_or_queries.append(" ".join(current_and_terms))

    return separate_or_queries
