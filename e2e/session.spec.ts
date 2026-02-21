import { test, expect, type Page, type BrowserContext } from "@playwright/test"

// ── helpers ────────────────────────────────────────────────────────────────

async function createSession(page: Page): Promise<string> {
  await page.goto("/create")

  // Host name
  await page.getByLabel("Host name").fill("Alice")

  // Participants (two slots pre-filled)
  const participantInputs = page.locator('input[placeholder^="Participant"]')
  await participantInputs.nth(0).fill("Alice")
  await participantInputs.nth(1).fill("Bob")

  // Add a third participant
  await page.getByRole("button", { name: "+ Add participant" }).click()
  await participantInputs.nth(2).fill("Carol")

  // Tasks
  const taskInputs = page.locator('input[placeholder^="Task"]')
  await taskInputs.nth(0).fill("Write report")
  await taskInputs.nth(1).fill("Build slides")
  await page.getByRole("button", { name: "+ Add task" }).click()
  await taskInputs.nth(2).fill("Record video")

  // Submit
  await page.getByRole("button", { name: "Create Session" }).click()

  // "Session Created" screen
  await expect(page.getByRole("heading", { name: "Session Created!" })).toBeVisible({
    timeout: 15000,
  })

  // Extract the session URL from the read-only input
  const urlInput = page.locator('input[readonly]')
  const sessionUrl = await urlInput.inputValue()
  expect(sessionUrl).toMatch(/\/session\/[a-f0-9-]{36}$/)
  return sessionUrl
}

async function castVote(
  page: Page,
  participantName: string,
  sessionUrl: string,
  coinDistribution: Record<string, number>
) {
  await page.goto(sessionUrl)

  // Pick participant
  await page.getByRole("button", { name: participantName }).click()

  // Distribute coins using the + buttons next to each task label
  for (const [taskLabel, coins] of Object.entries(coinDistribution)) {
    const row = page.locator("div.flex.items-center.justify-between.py-3", {
      has: page.locator(`text="${taskLabel}"`),
    })
    const plusBtn = row.getByRole("button", { name: "+" })
    for (let i = 0; i < coins; i++) {
      await plusBtn.click()
    }
  }

  // Submit
  await page.getByRole("button", { name: "Submit Vote" }).click()
}

// ── tests ──────────────────────────────────────────────────────────────────

test.describe("Fair Task Allocator — end-to-end", () => {
  let sessionUrl: string
  let hostContext: BrowserContext
  let hostPage: Page

  test.beforeAll(async ({ browser }) => {
    hostContext = await browser.newContext()
    hostPage = await hostContext.newPage()
  })

  test.afterAll(async () => {
    await hostContext.close()
  })

  // ── 1. Session creation ─────────────────────────────────────────────────
  test("host creates a session and sees the shareable link", async () => {
    sessionUrl = await createSession(hostPage)
  })

  // ── 2. Copy link ────────────────────────────────────────────────────────
  test("copy link button shows Copied! confirmation", async () => {
    // Grant clipboard-write permission to the context
    await hostContext.grantPermissions(["clipboard-write"])

    const copyBtn = hostPage.getByRole("button", { name: "Copy" })
    await copyBtn.click()
    await expect(hostPage.getByRole("button", { name: "Copied!" })).toBeVisible()
    // Reverts back after 2 s
    await expect(hostPage.getByRole("button", { name: "Copy" })).toBeVisible({ timeout: 3000 })
  })

  // ── 3. Host lobby ───────────────────────────────────────────────────────
  test("Go to Session lands on the host lobby", async () => {
    await hostPage.getByRole("button", { name: "Go to Session →" }).click()
    await expect(hostPage.getByText("Host Lobby")).toBeVisible({
      timeout: 10000,
    })
    // All three participants shown as Waiting
    const waitingBadges = hostPage.getByText("Waiting")
    await expect(waitingBadges).toHaveCount(3)
  })

  // ── 4. Participant view ─────────────────────────────────────────────────
  test("opening the session URL in a new context shows the participant selector (not host view)", async ({
    browser,
  }) => {
    const participantContext = await browser.newContext()
    const participantPage = await participantContext.newPage()
    await participantPage.goto(sessionUrl)
    await expect(participantPage.getByRole("heading", { name: "Who are you?" })).toBeVisible({
      timeout: 10000,
    })
    await participantContext.close()
  })

  // ── 5. Vote as Bob ──────────────────────────────────────────────────────
  test("Bob votes and host lobby updates", async ({ browser }) => {
    const bobContext = await browser.newContext()
    const bobPage = await bobContext.newPage()

    await castVote(bobPage, "Bob", sessionUrl, {
      "Write report": 5,
      "Build slides": 3,
      "Record video": 2,
    })

    // Bob sees the confirmation screen
    await expect(bobPage.getByText("Vote submitted!")).toBeVisible()

    // Host lobby should update to 1/3 voted within polling interval
    await expect(hostPage.getByText("1 / 3 voted")).toBeVisible({ timeout: 6000 })
    // Bob's row now shows "Voted"
    const bobRow = hostPage.locator('[data-testid="participant-row"]', {
      has: hostPage.locator("text=Bob"),
    })
    await expect(bobRow.getByText("Voted")).toBeVisible({ timeout: 6000 })

    await bobContext.close()
  })

  // ── 6. Vote as Carol ───────────────────────────────────────────────────
  test("Carol votes and host lobby updates to 2/3", async ({ browser }) => {
    const carolContext = await browser.newContext()
    const carolPage = await carolContext.newPage()

    await castVote(carolPage, "Carol", sessionUrl, {
      "Write report": 2,
      "Build slides": 5,
      "Record video": 3,
    })

    await expect(carolPage.getByText("Vote submitted!")).toBeVisible()
    await expect(hostPage.getByText("2 / 3 voted")).toBeVisible({ timeout: 6000 })

    await carolContext.close()
  })

  // ── 7. Host casts own vote ─────────────────────────────────────────────
  test("host clicks Cast Your Vote and submits as Alice", async () => {
    await hostPage.getByRole("button", { name: "Cast Your Vote →" }).click()
    await expect(hostPage.getByRole("heading", { name: "Who are you?" })).toBeVisible()

    // Alice shouldn't be grayed out yet
    await hostPage.getByRole("button", { name: "Alice" }).click()
    await expect(hostPage.getByRole("heading", { name: "Hi, Alice!" })).toBeVisible()

    // Distribute all 10 coins
    const writeRow = hostPage.locator("div.flex.items-center.justify-between.py-3", {
      has: hostPage.locator('text="Write report"'),
    })
    for (let i = 0; i < 4; i++) await writeRow.getByRole("button", { name: "+" }).click()

    const slidesRow = hostPage.locator("div.flex.items-center.justify-between.py-3", {
      has: hostPage.locator('text="Build slides"'),
    })
    for (let i = 0; i < 3; i++) await slidesRow.getByRole("button", { name: "+" }).click()

    const videoRow = hostPage.locator("div.flex.items-center.justify-between.py-3", {
      has: hostPage.locator('text="Record video"'),
    })
    for (let i = 0; i < 3; i++) await videoRow.getByRole("button", { name: "+" }).click()

    await hostPage.getByRole("button", { name: "Submit Vote" }).click()
    await expect(hostPage.getByText("Vote submitted!")).toBeVisible()

    // Host returns to lobby (not results)
    await expect(hostPage.getByText("Host Lobby")).toBeVisible({
      timeout: 5000,
    })
    // "View Results →" button appears
    await expect(hostPage.getByRole("button", { name: "View Results →" })).toBeVisible({
      timeout: 6000,
    })
  })

  // ── 8. Results page ────────────────────────────────────────────────────
  test("results page shows the allocation and a New Session link", async ({ browser }) => {
    // Navigate via "View Results →" in the host lobby
    await hostPage.getByRole("button", { name: "View Results →" }).click()
    await expect(hostPage.getByRole("heading", { name: "Task Allocation" })).toBeVisible({
      timeout: 10000,
    })

    // Every task should appear exactly once
    for (const task of ["Write report", "Build slides", "Record video"]) {
      await expect(hostPage.getByText(task)).toBeVisible()
    }

    // "Start a new session" link exists and navigates home
    const newSessionLink = hostPage.getByRole("link", { name: "Start a new session" })
    await expect(newSessionLink).toBeVisible()
    await newSessionLink.click()
    await expect(hostPage).toHaveURL("/create")

    // Also verify a participant arriving directly at results sees the page
    const guestCtx = await browser.newContext()
    const guestPage = await guestCtx.newPage()
    await guestPage.goto(sessionUrl + "/results")
    await expect(guestPage.getByRole("heading", { name: "Task Allocation" })).toBeVisible({
      timeout: 10000,
    })
    await guestCtx.close()
  })
})
