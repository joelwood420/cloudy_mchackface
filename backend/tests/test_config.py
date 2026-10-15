from app.config import same_database


def test_same_target_despite_scheme_and_query():
    assert same_database("postgres://u:p@h/d", "postgresql://u:p@h/d?sslmode=require")


def test_different_database_or_host_is_different():
    assert not same_database("postgres://u:p@h/d", "postgres://u:p@h/other")
    assert not same_database("postgres://u:p@h1/d", "postgres://u:p@h2/d")
