import os
from langchain_core.language_models import BaseChatModel

_instances: dict[str, BaseChatModel] = {}


def get_llm() -> BaseChatModel:
    """
    Returns a LangChain chat model.
    Provider controlled by LLM_PROVIDER env var (aws | azure).
    Model tier controlled by APP_ENV env var (dev | prod).
    """
    global _instances

    provider = os.environ.get("LLM_PROVIDER", "aws").lower()
    app_env  = os.environ.get("APP_ENV", "dev").lower()   # "dev" or "prod"
    cache_key = f"{provider}:{app_env}"

    if cache_key in _instances:
        return _instances[cache_key]

    if provider == "azure":
        from langchain_openai import AzureChatOpenAI

        deployment = (
            os.environ.get("AZURE_DEPLOYMENT_DEV", "gpt-4o-mini")
            if app_env == "dev"
            else os.environ.get("AZURE_DEPLOYMENT_PROD", "gpt-4o")
        )

        llm = AzureChatOpenAI(
            azure_deployment=deployment,
            azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
            api_key=os.environ["AZURE_OPENAI_API_KEY"],
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01"),
            temperature=float(os.environ.get("LLM_TEMPERATURE", "0.8")),
            max_tokens=int(os.environ.get("LLM_MAX_TOKENS", "1024")),
            model_kwargs={"response_format": {"type": "json_object"}},
        )
        print(f"[llm_provider] Azure OpenAI · deployment={deployment} · env={app_env}")

    else:  # aws (default)
        from langchain_aws import ChatBedrockConverse

        model_id = (
            os.environ.get("BEDROCK_MODEL_DEV", "anthropic.claude-3-haiku-20240307-v1:0")
            if app_env == "dev"
            else os.environ.get("BEDROCK_MODEL_PROD", "anthropic.claude-3-5-sonnet-20241022-v2:0")
        )

        llm = ChatBedrockConverse(
            model=model_id,
            region_name=os.environ.get("AWS_REGION", "us-east-1"),
            temperature=float(os.environ.get("LLM_TEMPERATURE", "0.8")),
            max_tokens=int(os.environ.get("LLM_MAX_TOKENS", "1024")),
        )
        print(f"[llm_provider] AWS Bedrock · model={model_id} · env={app_env}")

    _instances[cache_key] = llm
    return llm


def reset_llm_cache():
    """Call this if credentials change at runtime."""
    global _instances
    _instances = {}