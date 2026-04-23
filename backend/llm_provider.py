import os
from langchain_core.language_models import BaseChatModel

_instances: dict[str, BaseChatModel] = {}


def get_llm(purpose: str = "general") -> BaseChatModel:
    """
    purpose: "general" = GPT-5.4 standard settings
             "code"    = GPT-5.4 with higher token limit + lower temperature for code generation
    """
    global _instances

    provider  = os.environ.get("LLM_PROVIDER", "aws").lower()
    app_env   = os.environ.get("APP_ENV", "dev").lower()
    cache_key = f"{provider}:{app_env}:{purpose}"

    if cache_key in _instances:
        return _instances[cache_key]

    if provider == "azure":
        from langchain_openai import AzureChatOpenAI

        deployment = os.environ.get("AZURE_DEPLOYMENT_DEV", "gpt-5.4")

        if purpose == "code":
            max_completion_tokens = int(os.environ.get("LLM_MAX_TOKENS_CODE", "8192"))
            temperature = 0.2
        else:
            max_completion_tokens = int(os.environ.get("LLM_MAX_TOKENS", "2048"))
            temperature = float(os.environ.get("LLM_TEMPERATURE", "0.8"))

        llm = AzureChatOpenAI(
            azure_deployment=deployment,
            azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
            api_key=os.environ["AZURE_OPENAI_API_KEY"],
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2025-04-01-preview"),
            temperature=temperature,
             model_kwargs={"max_completion_tokens": max_completion_tokens},
        )
        print(f"[llm_provider] Azure OpenAI · deployment={deployment} · purpose={purpose} · max_tokens={max_completion_tokens}")

    else:
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
            max_tokens=int(os.environ.get("LLM_MAX_TOKENS", "2048")),
        )
        print(f"[llm_provider] AWS Bedrock · model={model_id} · purpose={purpose}")

    _instances[cache_key] = llm
    return llm


def reset_llm_cache():
    global _instances
    _instances = {}