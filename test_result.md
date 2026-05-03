#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

## user_problem_statement: Validate the new growth features batch — Public Leaderboard, Referral system (?ref=CODE → +30 days for both on first paid subscribe), Monthly Profit Goal tile, Year-in-Review modal, and Annual "PRO MEMBER" badge.

## backend:
##   - task: "GET /api/leaderboard (public, profit/cards metrics)"
##     implemented: true
##     working: true
##     file: "backend/server.py"
##     status_history:
##         - working: true
##           agent: "main"
##           comment: "curl returned 1 row with bar/handle/is_pro/is_annual_pro fields. metric=profit and metric=cards both supported."
##   - task: "GET /api/me/referral + register accepts referral_code"
##     implemented: true
##     working: true
##     file: "backend/server.py"
##     status_history:
##         - working: true
##           agent: "main"
##           comment: "Returns {code, referred_count, share_url, rewards_given_months}. /auth/register accepts referral_code body field."
##   - task: "GET /api/me/monthly-progress + PUT /api/me/goal"
##     implemented: true
##     working: true
##     file: "backend/server.py"
##     status_history:
##         - working: true
##           agent: "main"
##           comment: "Returns {month, profit, flips, goal, pct}; goal can be null to clear."
##   - task: "GET /api/me/year-recap"
##     implemented: true
##     working: true
##     file: "backend/server.py"
##     status_history:
##         - working: true
##           agent: "main"
##           comment: "Returns {year, total_profit, flips, cards_added, spend, best_flip, top_sport}."
##   - task: "PUT /api/me/leaderboard-prefs"
##     implemented: true
##     working: true
##     file: "backend/server.py"
##     status_history:
##         - working: true
##           agent: "main"
##           comment: "Accepts leaderboard_opt_out, leaderboard_show_name, leaderboard_handle (24-char max). Validated with curl."
##   - task: "is_annual_pro flag on /api/billing/me"
##     implemented: true
##     working: true
##     file: "backend/server.py"
##     status_history:
##         - working: true
##           agent: "main"
##           comment: "Returned correctly; uses annual_pro user flag AND active expiry."

## frontend:
##   - task: "Profile page Referral + Leaderboard prefs sections"
##     implemented: true
##     working: "NA"
##     file: "frontend/src/pages/Profile.jsx"
##     needs_retesting: true
##     status_history:
##         - working: "NA"
##           agent: "main"
##           comment: "Referral card + Leaderboard prefs card both wired and visible. Needs e2e test."
##   - task: "Dashboard mounts MonthlyGoalTile + YearInReviewModal + Leaderboard link + My Recap button"
##     implemented: true
##     working: "NA"
##     file: "frontend/src/pages/Dashboard.jsx"
##     needs_retesting: true
##     status_history:
##         - working: "NA"
##           agent: "main"
##           comment: "Tile renders next to Best Flip; My Recap button opens YearInReviewModal; Leaderboard link present."
##   - task: "Landing captures ?ref=CODE → Login.jsx sends referral_code on register"
##     implemented: true
##     working: "NA"
##     file: "frontend/src/pages/Landing.jsx, frontend/src/pages/Login.jsx"
##     needs_retesting: true
##     status_history:
##         - working: "NA"
##           agent: "main"
##           comment: "Landing.jsx writes ref to localStorage; Login.jsx onRegister reads and sends to /auth/register."
##   - task: "Public Leaderboard page renders podium + list + opt-in tier badges"
##     implemented: true
##     working: "NA"
##     file: "frontend/src/pages/Leaderboard.jsx"
##     needs_retesting: true
##     status_history:
##         - working: "NA"
##           agent: "main"
##           comment: "Smoke screenshot rendered correctly with #1 Diamond tier and crown icon."

## metadata:
##   created_by: "main_agent"
##   version: "1.1"
##   test_sequence: 1
##   run_ui: true

## test_plan:
##   current_focus:
##     - "Public Leaderboard page renders podium + list + opt-in tier badges"
##     - "Profile page Referral + Leaderboard prefs sections"
##     - "Dashboard mounts MonthlyGoalTile + YearInReviewModal + Leaderboard link + My Recap button"
##     - "Landing captures ?ref=CODE → Login.jsx sends referral_code on register"
##   stuck_tasks: []
##   test_all: false
##   test_priority: "high_first"

## agent_communication:
##     - agent: "main"
##       message: "Backend endpoints validated via curl on the demo account. Frontend wiring complete. Need e2e Playwright validation for Profile referral copy/leaderboard toggles, Dashboard goal tile + My Recap modal, and Leaderboard public page."