from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Desktop viewport
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        page.goto("http://localhost:3000")
        page.wait_for_selector("text=Si-Imsak", state="visible")

        # Test location search clear button
        search_input = page.locator('input[aria-label="Cari kota"]')
        search_input.wait_for(state="attached")
        search_input.click(force=True)
        page.keyboard.type("Jakarta")
        page.wait_for_timeout(2000)

        clear_btn = page.locator('button[aria-label="Hapus pencarian"]')
        if clear_btn.count() > 0:
            print("Found location clear btn, clicking...")
            clear_btn.click(force=True)
            page.wait_for_timeout(500)
        else:
            print("Location clear btn not found after typing")

        page.screenshot(path="screenshot_location.png")

        print("Success")
        browser.close()

run()
