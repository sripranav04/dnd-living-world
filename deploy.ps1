# deploy.ps1
# Run this from: D:\edu\my projects\dungeons and dragons\dnd-living-world\

$ACR_NAME = "dndworldacr"
$ACR_LOGIN_SERVER = "dndworldacr.azurecr.io"
$IMAGE_NAME = "dnd-living-world"
$IMAGE_TAG = "latest"

Write-Host "==> Logging into Azure Container Registry..." -ForegroundColor Cyan
az acr login --name $ACR_NAME

Write-Host "==> Building Docker image..." -ForegroundColor Cyan
docker build -t "$ACR_LOGIN_SERVER/${IMAGE_NAME}:${IMAGE_TAG}" .

Write-Host "==> Pushing image to ACR..." -ForegroundColor Cyan
docker push "$ACR_LOGIN_SERVER/${IMAGE_NAME}:${IMAGE_TAG}"

Write-Host "==> Done! Image available at: $ACR_LOGIN_SERVER/${IMAGE_NAME}:${IMAGE_TAG}" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: create Container App in Azure Portal using this image." -ForegroundColor Yellow