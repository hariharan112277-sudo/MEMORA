import os
import time
from playwright.sync_api import sync_playwright

def capture():
    os.makedirs("docs", exist_ok=True)
    
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="msedge", headless=True)
        except Exception:
            browser = p.chromium.launch(headless=True)
            
        page = browser.new_page(viewport={"width": 1366, "height": 900})
        
        # 1. Login Page / Landing
        print("Navigating to http://localhost:5000/login...")
        page.goto("http://localhost:5000/login")
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.abspath("docs/screenshot-login.png"))
        
        # 2. Click "Continue with the demo learner"
        demo_btn = page.query_selector("button:has-text('Continue with the demo learner')")
        if demo_btn:
            demo_btn.click()
            page.wait_for_timeout(3000)
            
            # Dashboard Screenshot
            page.screenshot(path=os.path.abspath("docs/screenshot-dashboard.png"))
            print("Saved dashboard screenshot")
            
            # Navigate to Subjects
            page.goto("http://localhost:5000/subjects")
            page.wait_for_timeout(2000)
            page.screenshot(path=os.path.abspath("docs/screenshot-subjects.png"))
            print("Saved subjects screenshot")
            
            # Navigate to Analytics
            page.goto("http://localhost:5000/analytics")
            page.wait_for_timeout(2000)
            page.screenshot(path=os.path.abspath("docs/screenshot-analytics.png"))
            print("Saved analytics screenshot")
            
        browser.close()

if __name__ == "__main__":
    capture()
