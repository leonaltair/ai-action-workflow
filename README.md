## ai-action-workflow

YAML 编排的大模型 Agent Workflow 运行器（类 GitHub Actions）。

### 目标
- 使用类似 GitHub Actions 的 `jobs`/`steps`/`env`/`needs` 语义进行工作流编排
- 内置步骤类型：`agent`（调用 LLM）、`http`（HTTP 请求）、`shell`（本地命令）
- 支持 `${{ ... }}` 表达式引用上下文（env、前置步骤输出）

### 快速开始
1. 安装依赖：`npm i`
2. 设置环境变量：在项目根目录新建 `.env`，写入 `OPENAI_API_KEY=...`
3. 运行示例：`npm run demo`

### 示例 YAML
```yaml
name: simple
env:
  MODEL: gpt-4o-mini
jobs:
  plan:
    steps:
      - name: ask
        uses: agent
        with:
          model: ${{ env.MODEL }}
          prompt: |
            请列出三步计划来研究 ${{ inputs.topic }}。
        outputs:
          plan: ${{ steps.ask.result.content }}
  act:
    needs: [plan]
    steps:
      - name: echo
        uses: shell
        with:
          cmd: echo "Plan: ${{ jobs.plan.outputs.plan }}"
```

### 设计要点
- 拓扑排序按 `needs` 执行 `jobs`
- 步骤间通过 `steps.{name}.result` 共享输出，`jobs.{id}.outputs` 对外暴露
- Agent 步骤最小封装 OpenAI Chat Completions（可扩展至其它提供商）


