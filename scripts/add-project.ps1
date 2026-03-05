param(
  [Parameter(Mandatory = $true)][string]$Name,
  [Parameter(Mandatory = $true)][string]$Slug,
  [Parameter(Mandatory = $true)][string]$Summary,
  [Parameter(Mandatory = $false)][string]$Stack = "HTML/CSS/JavaScript",
  [Parameter(Mandatory = $false)][ValidateSet("stable", "wip")][string]$Status = "stable"
)

$ErrorActionPreference = "Stop"

$projectRoot = Join-Path "projects" $Slug
$jsonPath = "projects/projects.json"

if (-not (Test-Path $jsonPath)) {
  throw "未找到 $jsonPath"
}

if (-not (Test-Path $projectRoot)) {
  New-Item -ItemType Directory -Path $projectRoot -Force | Out-Null
}

$readmePath = Join-Path $projectRoot "README.md"
if (-not (Test-Path $readmePath)) {
  @"
# $Name

## 项目简介

$Summary

## 技术栈

$Stack

## 运行方式

- 如果是纯静态页面：可在项目目录启动静态服务并访问 `index.html`
"@ | Set-Content -Path $readmePath -Encoding utf8
}

$raw = Get-Content -Raw $jsonPath | ConvertFrom-Json
$list = @()
if ($null -ne $raw) {
  if ($raw -is [System.Collections.IEnumerable] -and $raw -isnot [string]) {
    $list = @($raw)
  } else {
    $list = @($raw)
  }
}

if ($list | Where-Object { $_.slug -eq $Slug }) {
  throw "slug 已存在：$Slug"
}

$newItem = [PSCustomObject]@{
  name = $Name
  slug = $Slug
  summary = $Summary
  stack = $Stack
  status = $Status
  path = "./projects/$Slug/"
  entry = "./projects/$Slug/index.html"
  readme = "./projects/$Slug/README.md"
}

$list = @($list) + $newItem
$list | ConvertTo-Json -Depth 5 | Set-Content -Path $jsonPath -Encoding utf8

Write-Host "已登记项目：$Name ($Slug)"
Write-Host "目录：$projectRoot"
