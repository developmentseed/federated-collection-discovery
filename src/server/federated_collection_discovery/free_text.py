"""Free-text search as described in OGC API - Features - Part 9: Text Search
https://docs.ogc.org/DRAFTS/24-031.html#q-parameter

That is the SPEC that the collection-search STAC API extension is meant to follow,
but there are some inconsistencies in the described examples regarding spaces
and whether they should represent OR or AND clauses!

https://github.com/stac-api-extensions/freetext-search/blob/master/README.md#http-get

This implementation respects the OGC API spec and treats spaces as AND clauses.

The sqlite fts5 free-text search functionality makes it possible to mimic
Postgres' tsquery pretty closely which is nice because pgstac will probably use
tsquery when the free-text search extension is implemented.


https://www.sqlite.org/fts5.html
https://www.postgresql.org/docs/current/functions-textsearch.html
"""

import re
import sqlite3
from typing import List


def parse_query_for_sqlite(q: str) -> str:
    # separate out search terms, quoted exact phrases, commas, and exact phrases
    tokens = [token.strip() for token in re.findall(r'"[^"]*"|,|[\(\)]|[^,\s\(\)]+', q)]

    for i, token in enumerate(tokens):
        if token.startswith("+"):
            tokens[i] = token[1:].strip()
        elif token.startswith("-"):
            tokens[i] = "NOT " + token[1:].strip()
        elif token == ",":
            tokens[i] = "OR"

    return " ".join(tokens)


def sqlite_text_search(q: str, text_fields: dict[str, str]) -> bool:
    column_clause = ", ".join(text_fields.keys())
    value_clause = ", ".join(["?" for _ in text_fields.keys()])

    with sqlite3.connect(":memory:") as conn:  # Use an in-memory database
        cursor = conn.cursor()

        cursor.execute(
            f"""
        CREATE VIRTUAL TABLE collections USING fts5({column_clause});
        """
        )

        cursor.execute(
            f"""
        INSERT INTO collections ({column_clause}) VALUES ({value_clause});
        """,
            tuple(text_fields.values()),
        )

        cursor.execute(
            f"""
        SELECT COUNT(*)
        FROM collections WHERE collections MATCH '{parse_query_for_sqlite(q)}';
        """
        )

        return bool(cursor.fetchone()[0])


def escape_regex(term):
    return re.escape(term)


def handle_inclusion_exclusion(token):
    if token.startswith("+"):
        term = token[1:]
        return r"(?=.*\b{}\b)".format(escape_regex(term))
    elif token.startswith("-"):
        term = token[1:]
        return r"(?!.*\b{}\b)".format(escape_regex(term))
    else:
        return escape_regex(token)


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
