import os
import time
from playwright.sync_api import sync_playwright

def capture():
    os.makedirs("docs", exist_ok=True)
    
    with sync_playwright() as p:
        # Launch edge or chromium
        try:
            browser = p.chromium.launch(channel="msedge", headless=True)
        except Exception:
            browser = p.chromium.launch(headless=True)
            
        page = browser.new_page(viewport={"width": 1366, "height": 900})
        
        # 1. Capture Dashboard
        print("Navigating to http://localhost:5000/dashboard...")
        page.goto("http://localhost:5000/dashboard")
        page.wait_for_timeout(3000) # wait for API calls and Chart.js render
        
        dashboard_path = os.path.abspath("docs/screenshot-dashboard.png")
        page.screenshot(path=dashboard_path, full_page=False)
        print(f"Saved dashboard screenshot to {dashboard_path}")
        
        # 2. Click Revise button to open Quiz modal
        revise_btn = page.query_selector("button:has-text('Revise')")
        if revise_btn:
            revise_btn.click()
            page.wait_for_timeout(1500)
            quiz_path = os.path.abspath("docs/screenshot-quiz.png")
            page.screenshot(path=quiz_path, full_page=False)
            print(f"Saved quiz screenshot to {quiz_path}")
        else:
            print("Revise button not found")
            
        browser.close()

if __name__ == "__main__":
    capture()
