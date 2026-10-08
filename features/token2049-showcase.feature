# Status tags describe evidence, not automated runner results.
# @executed_kernel_only: standalone actual MEW kernel assertion run on 8 October 2026.
# @untested_ui: acceptance criterion awaiting browser/source verification.
# @source_reviewed: source inspected; not equivalent to network-capture/browser automation.
# @lead_browser_observed: browser result reported by lead, not executed by this reviewer.
# No Gherkin browser runner has executed this feature.
Feature: Explain a bounded purchasing mandate without activating money

  @executed_kernel_only
  Scenario: An uncertain equivalent purchase occupies capacity below the monetary ceiling
    Given an ephemeral MEW instance permits one report and 3000000 lovelace of exposure
    When Alpha is admitted for 1500000 lovelace
    And a simulated unknown outcome is recorded for Alpha
    And Beta requests the equivalent report for 1400000 lovelace
    Then Alpha's decision is ALLOW
    And Beta's decision is DEFER
    And exposure remains 1500000 lovelace
    And the one-report capacity remains occupied
    And no second effect is created
    And the quoted 2900000 lovelace total remains below the ceiling

  @source_reviewed @reviewed_desktop_capture
  Scenario: The first screen introduces the decision and its evidence mode
    Given a visitor opens the showcase
    When the first screen is displayed
    Then the shared purchasing mandate is understandable without a presenter
    And one primary action leads into the local example
    And a visible adjacent label states simulation and no funds move
    And illustrative ADA values are not labeled funded results

  @source_reviewed @untested_runtime_network_capture
  Scenario: The demo stays local and does not alter shared work
    Given the showcase creates a fresh ephemeral MEW instance
    When the visitor runs every demo step and resets the example
    Then decision state is calculated by the actual MEW kernel
    And no API request or analytics event is sent by the demo
    And no wallet or private record is accessed
    And no browser storage or server journal is written
    And another presenter's persisted rehearsal remains unchanged

  @source_reviewed @lead_browser_observed
  Scenario: The reason for deferral is correctly explained
    Given Alpha's unknown outcome retains 1.50 ADA and one report of capacity
    When Beta's 1.40 ADA request is deferred
    Then the result explains occupied equivalent-report capacity
    And it does not describe 2.90 ADA as exceeding a 3.00 ADA ceiling
    And a timeout is not presented as failure or refund proof

  @source_reviewed @lead_browser_observed
  Scenario: Keyboard controls run and reset the actual local decision
    Given the actual kernel is loaded in the showcase
    When the visitor uses Enter to advance the demo
    Then the states progress through ALLOW and UNKNOWN to DEFER
    When the visitor uses Space on Restart
    Then the display returns to READY with 0.00 ADA and 0 of 1 reports held
    When the visitor uses Space on Pause motion
    Then the control has pressed state true and a Resume label
    And focused demo controls have a visible mint outline

  @source_reviewed @untested_screen_reader @untested_full_focus_order
  Scenario: Assistive technology exposes the complete result
    Given a visitor navigates with a keyboard
    When they skip to main content and operate each demo control
    Then each interactive control has an accessible name and visible focus
    And each decision is announced politely
    And all essential state is readable without decorative art or color cues

  @lead_browser_observed
  Scenario Outline: Small screens preserve page geometry
    Given a viewport is <width> CSS pixels wide and <height> CSS pixels tall
    When the visitor reads and operates the showcase
    Then page scroll width equals viewport client width
    And no horizontal page overflow is observed
    Examples:
      | width | height |
      | 320   | 740    |
      | 375   | 812    |

  @source_reviewed @untested_runtime_os_preference
  Scenario: Reduced-motion preference preserves the story
    Given the operating system requests reduced motion
    When the visitor reads and operates the showcase
    Then essential content is not hidden behind animation
    And decorative animation and transition motion are disabled

  @untested_all_touch_targets
  Scenario: Every small-screen control meets the touch target
    Given a visitor uses the showcase on a phone
    When every interactive control is measured
    Then touch controls meet the 44-pixel target

  @source_reviewed @lead_browser_observed_primary_navigation
  Scenario: Evidence and pilot links have truthful continuity
    Given the visitor has inspected the local decision
    When they follow protocol, evidence and pilot links
    Then local destinations resolve to public pages
    And shared persisted rehearsals are identified separately from this ephemeral demo
    And model format success is not presented as grounded-answer success
    And external audit, funded payment proof and customer validation remain pending
    And no ecosystem partnership or customer outcome is fabricated
