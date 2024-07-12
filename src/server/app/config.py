from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):  # type: ignore
    stac_api_urls: str = Field(
        default="",
        description="comma separated list of STAC API URLs",
    )
    cmr_urls: str = Field(default="", description="comma separated list of CMR URLs")

    @field_validator("stac_api_urls")
    def parse_stac_api_urls(cls, v):
        return v.split(",")

    @field_validator("cmr_urls")
    def parse_cmr_urls(cls, v):
        return v.split(",")

    model_config = {"env_prefix": "CROSS_CATALOG_SEARCH_", "env_file": ".env"}
