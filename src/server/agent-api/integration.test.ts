import { describe, expect, it } from "vitest"
import contract from "../../../spec/openapi.json"
import { createAgentApi } from "./app"
import { registerAppRoutes } from "./apps"
import { registerBoardRoutes } from "./boards"
import { registerIconRoutes } from "./icons"

describe("agent API contract", () => {
  it("serves the checked-in OpenAPI document with bearer protection on every data path", async () => {
    const app = createAgentApi(async () => null)
    registerAppRoutes(app)
    registerBoardRoutes(app)
    registerIconRoutes(app)
    const response = await app.request("/api/v1/openapi.json")
    expect(await response.json()).toEqual(contract)
    expect(contract.paths["/api/v1/boards"]?.post).toBeDefined()
    expect(contract.paths["/api/v1/apps/{appId}"]?.put?.security).toEqual([
      { Bearer: [] },
    ])
    expect(contract.components.securitySchemes.Bearer).toMatchObject({
      type: "http",
      scheme: "bearer",
    })
    expect(contract.components.schemas.App.properties).toHaveProperty(
      "statusChecksEnabled",
      { type: "boolean" },
    )
    expect(contract.components.schemas.BoardApp.properties).toHaveProperty(
      "statusChecksEnabled",
      { type: "boolean" },
    )
    for (const operation of [
      contract.paths["/api/v1/apps"]?.post,
      contract.paths["/api/v1/apps/{appId}"]?.put,
    ]) {
      const json = JSON.stringify(
        operation?.requestBody?.content["application/json"].schema,
      )
      expect(json).toContain("darkIcon")
    }
    expect(
      Object.keys(contract.components.schemas.App.properties),
    ).not.toContain("darkIcon")
  })
})
