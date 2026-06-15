from playwright.sync_api import sync_playwright
import time
import os

def test_search_clear():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # Set mobile viewport to ensure bottom tabs are visible
        context = browser.new_context(viewport={'width': 390, 'height': 844})
        page = context.new_page()

        print("Navigating to local dev server...")
        page.goto("http://localhost:3000")

        print("Dismissing location prompt if present...")
        try:
            page.wait_for_selector("text=Nanti", timeout=3000)
            page.click("text=Nanti")
        except:
            pass

        try:
            page.wait_for_selector("text=Tutup", timeout=3000)
            page.click("text=Tutup")
        except:
            pass

        print("Testing LocationSearch...")
        page.fill("input[aria-label='Cari kota']", "Bandung")
        page.wait_for_timeout(500)

        print("Taking screenshot of location search with text...")
        os.makedirs("verification/screenshots", exist_ok=True)
        page.screenshot(path="verification/screenshots/locationsearch-filled.png")

        print("Clicking clear button in LocationSearch...")
        page.click("button[aria-label='Hapus pencarian']")

        print("Taking screenshot after clear location search...")
        page.screenshot(path="verification/screenshots/locationsearch-cleared.png")

        # Test MosqueFinder search input
        print("Clicking Masjid tab...")
        try:
            page.click("button:has-text('Masjid')")
        except Exception as e:
            print("Could not click Masjid tab:", e)
            page.screenshot(path="verification/screenshots/error-masjid-tab.png")
            raise e

        print("Typing in MosqueFinder search...")
        page.fill("input[aria-label='Cari kota untuk lokasi masjid']", "Jakarta")
        page.wait_for_timeout(500)

        print("Taking screenshot of search with text...")
        page.screenshot(path="verification/screenshots/mosquefinder-filled.png")

        print("Clicking clear button in MosqueFinder...")
        page.click("button[aria-label='Hapus pencarian']")

        print("Taking screenshot after clear...")
        page.screenshot(path="verification/screenshots/mosquefinder-cleared.png")

        print("UI tests completed successfully.")
        browser.close()

if __name__ == "__main__":
    test_search_clear()
