// src/components/ActivityReconciliation.jsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  FaExclamationCircle,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaClock,
} from "react-icons/fa";
import styles from "./ActivityReconciliation.module.css";

const ActivityReconciliation = ({ employeeId, apiBase }) => {
  const BASE_URL =
    apiBase || process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [monthOptions, setMonthOptions] = useState([]);
  const [selectedMonthYear, setSelectedMonthYear] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL"); // ALL | ACTIVITY_MISSED | ATTENDANCE_MISSED

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowFullModal(false);
      }
    };

    if (showFullModal) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showFullModal]);

  // 1. Fetch Month Dropdown starting from September 2026
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch(
          `${BASE_URL}/api/activity-reminder/activity-month-options`,
        );
        const result = await res.json();
        if (result.options && result.options.length > 0) {
          setMonthOptions(result.options);
          // Default to the current month option (second option, or first if only one)
          const defaultOpt = result.options[1] || result.options[0];
          setSelectedMonthYear(defaultOpt.value);
        }
      } catch (err) {
        console.error("Failed to load month options:", err);
      }
    };
    fetchOptions();
  }, [BASE_URL]);

  // 2. Fetch Comparison Data
  useEffect(() => {
    if (!employeeId || !selectedMonthYear) return;

    let queryParam = "";
    if (selectedMonthYear === "ALL") {
      queryParam = `year=ALL&month=ALL`;
    } else {
      const [year, month] = selectedMonthYear.split("-");
      queryParam = `year=${year}&month=${month}`;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${BASE_URL}/api/activity-reminder/monthly-activity-reconciliation?employeeId=${encodeURIComponent(
            employeeId,
          )}&${queryParam}`,
        );
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Failed to load reconciliation data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [employeeId, selectedMonthYear, BASE_URL]);

  if (!employeeId) return null;

  // 🌟 ACCUMULATED STATS (From September 2026 to present)
  const accActivityMissed = data?.accumulatedSummary?.totalActivityMissed || 0;
  const accPunchMissed = data?.accumulatedSummary?.totalAttendanceMissed || 0;
  const totalAccIssues = accActivityMissed + accPunchMissed;

  // Modal Table records & filter
  const modalRecords = (data?.records || []).filter((item) => {
    if (activeTab === "ALL") return true;
    return item.status === activeTab;
  });

  const modalViewActivityMissed = data?.summary?.totalActivityMissed || 0;
  const modalViewPunchMissed = data?.summary?.totalAttendanceMissed || 0;

  // Render Full Modal via Portal
  const renderModal = () => {
    if (!showFullModal) return null;

    return ReactDOM.createPortal(
      <div
        className={styles.actrecon_modal_overlay}
        onClick={() => setShowFullModal(false)}
      >
        <div
          className={styles.actrecon_modal_container}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.actrecon_modal_header}>
            <div className={styles.actrecon_header_title_box}>
              <FaClock className={styles.actrecon_header_icon} />
              <div>
                <h6 className={styles.actrecon_header_h6}>
                  Activity Sheet & Attendance Breakdown
                </h6>
                <p className={styles.actrecon_header_sub}>
                  Accumulated reconciliation starting from September 2026
                </p>
              </div>
            </div>
            <button
              type="button"
              className={styles.actrecon_btn_close}
              onClick={() => setShowFullModal(false)}
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div className={styles.actrecon_modal_body}>
            {/* Top Bar: Selector + Summary Badges */}
            <div className={styles.actrecon_controls_bar}>
              <div className={styles.actrecon_select_wrap}>
                <label
                  htmlFor="actrecon_month_dropdown"
                  className={styles.actrecon_select_label}
                >
                  View Period:
                </label>
                <select
                  id="actrecon_month_dropdown"
                  className={styles.actrecon_month_dropdown}
                  value={selectedMonthYear}
                  onChange={(e) => setSelectedMonthYear(e.target.value)}
                >
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Accumulated + Month Summary Badges */}
              <div className={styles.actrecon_summary_row}>
                <span
                  className={`${styles.actrecon_badge_stat} ${styles.actrecon_stat_danger}`}
                  title="Accumulated from September 2026 to today"
                >
                  Total Missed (Since Sep): <b>{accActivityMissed}</b>
                </span>
                <span
                  className={`${styles.actrecon_badge_stat} ${styles.actrecon_stat_warning}`}
                >
                  Selected Period Missed: <b>{modalViewActivityMissed}</b>
                </span>
                <span
                  className={`${styles.actrecon_badge_stat} ${styles.actrecon_stat_success}`}
                >
                  Completed: <b>{data?.summary?.totalCompleted || 0}</b>
                </span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className={styles.actrecon_tab_group}>
              <button
                type="button"
                className={`${styles.actrecon_tab_btn} ${
                  activeTab === "ALL" ? styles.actrecon_tab_active_dark : ""
                }`}
                onClick={() => setActiveTab("ALL")}
              >
                All ({data?.records?.length || 0})
              </button>
              <button
                type="button"
                className={`${styles.actrecon_tab_btn} ${
                  activeTab === "ACTIVITY_MISSED"
                    ? styles.actrecon_tab_active_danger
                    : ""
                }`}
                onClick={() => setActiveTab("ACTIVITY_MISSED")}
              >
                Activity Missed ({modalViewActivityMissed})
              </button>
              <button
                type="button"
                className={`${styles.actrecon_tab_btn} ${
                  activeTab === "ATTENDANCE_MISSED"
                    ? styles.actrecon_tab_active_warning
                    : ""
                }`}
                onClick={() => setActiveTab("ATTENDANCE_MISSED")}
              >
                Punch Missed ({modalViewPunchMissed})
              </button>
            </div>

            {/* Table Area */}
            {loading ? (
              <div className="text-center py-5">
                <div
                  className="spinner-border spinner-border-sm text-primary"
                  role="status"
                ></div>
                <div className="mt-2 text-muted small">Loading records...</div>
              </div>
            ) : modalRecords.length === 0 ? (
              <div className={styles.actrecon_empty_state}>
                <FaCheckCircle className="text-success fs-3 mb-2" />
                <div className="fw-bold text-dark">No discrepancies found</div>
                <small className="text-muted">
                  Everything matches for this period.
                </small>
              </div>
            ) : (
              <div className={styles.actrecon_table_card}>
                <table className={styles.actrecon_custom_table}>
                  <thead>
                    <tr>
                      <th style={{ width: "16%" }}>Date</th>
                      <th style={{ width: "26%" }}>Attendance Working Hours</th>
                      <th style={{ width: "20%" }}>Activity Sheet Hours</th>
                      <th style={{ width: "18%" }}>Status</th>
                      <th style={{ width: "20%" }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalRecords.map((row, idx) => {
                      const isActMissed = row.status === "ACTIVITY_MISSED";
                      const isPunchMissed = row.status === "ATTENDANCE_MISSED";

                      return (
                        <tr
                          key={idx}
                          className={
                            isActMissed
                              ? styles.actrecon_row_activity_missed
                              : isPunchMissed
                                ? styles.actrecon_row_punch_missed
                                : ""
                          }
                        >
                          <td className={styles.actrecon_date_text}>
                            {row.date}
                          </td>

                          <td>
                            {isPunchMissed ? (
                              <span
                                className={`${styles.actrecon_pill_status} ${styles.actrecon_pill_status_danger}`}
                              >
                                Not Punched
                              </span>
                            ) : (
                              <div>
                                <span className="fw-semibold text-dark">
                                  {row.workingHours}
                                </span>
                                {row.attendanceInTime && (
                                  <div className={styles.actrecon_time_detail}>
                                    In: {row.attendanceInTime} | Out:{" "}
                                    {row.attendanceOutTime || "—"}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td>
                            {isActMissed ? (
                              <span
                                className={`${styles.actrecon_pill_status} ${styles.actrecon_pill_status_danger}`}
                              >
                                0 hrs (Missed)
                              </span>
                            ) : (
                              <span className="fw-semibold text-dark">
                                {row.activityHours}
                              </span>
                            )}
                          </td>

                          <td>
                            {row.status === "ACTIVITY_MISSED" && (
                              <span
                                className={`${styles.actrecon_pill_status} ${styles.actrecon_pill_status_danger}`}
                              >
                                Activity Missed
                              </span>
                            )}
                            {row.status === "ATTENDANCE_MISSED" && (
                              <span
                                className={`${styles.actrecon_pill_status} ${styles.actrecon_pill_status_warning}`}
                              >
                                Punch Missed
                              </span>
                            )}
                            {row.status === "COMPLETED" && (
                              <span
                                className={`${styles.actrecon_pill_status} ${styles.actrecon_pill_status_success}`}
                              >
                                Completed
                              </span>
                            )}
                            {/* 🌟 NEW: IN PROGRESS BADGE FOR TODAY */}
                            {row.status === "IN_PROGRESS" && (
                              <span
                                className={`${styles.actrecon_pill_status} ${styles.actrecon_pill_status_info}`}
                              >
                                In Progress
                              </span>
                            )}
                          </td>

                          <td>
                            <small className="text-secondary">
                              {row.remarks}
                            </small>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={styles.actrecon_modal_footer}>
            <button
              type="button"
              className={styles.actrecon_btn_done}
              onClick={() => setShowFullModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  return (
    <>
      {/* 🌟 ATTRACTIVE COMPACT TOP PILL (SHOWS ACCUMULATED COUNT) */}
      <div
        onClick={() => setShowFullModal(true)}
        className={`${styles.actrecon_top_pill} ${
          totalAccIssues > 0
            ? styles.actrecon_pill_danger
            : styles.actrecon_pill_success
        }`}
        title="Click to view activity breakdown starting from September 2026"
      >
        <div className={styles.actrecon_pill_left}>
          {loading ? (
            <div
              className="spinner-border spinner-border-sm text-secondary"
              role="status"
            ></div>
          ) : totalAccIssues > 0 ? (
            <FaExclamationCircle className={styles.actrecon_icon_danger} />
          ) : (
            <FaCheckCircle className={styles.actrecon_icon_success} />
          )}

          <div>
            {loading ? (
              <span className={styles.actrecon_text_loading}>
                Checking activities...
              </span>
            ) : totalAccIssues > 0 ? (
              <span className={styles.actrecon_text_danger}>
                {accActivityMissed > 0
                  ? `${accActivityMissed} Day(s) Activity Missed`
                  : `${accPunchMissed} Day(s) Punch Missed`}
              </span>
            ) : (
              <span className={styles.actrecon_text_success}>
                Activities Up to Date (Since Sep 2026)
              </span>
            )}
          </div>
        </div>

        <span
          className={
            totalAccIssues > 0
              ? styles.actrecon_view_badge_danger
              : styles.actrecon_view_badge_success
          }
        >
          View <FaExternalLinkAlt style={{ fontSize: "8px" }} />
        </span>
      </div>

      {/* 🌟 PORTAL MODAL */}
      {renderModal()}
    </>
  );
};

export default ActivityReconciliation;
