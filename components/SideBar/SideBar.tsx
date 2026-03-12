import React from "react";
import styles from "./SideBar.module.scss";

interface SideBarProps {
  className?: string;
}

const SideBar: React.FC<SideBarProps> = ({ className }) => {
  return (
    <aside className={`${styles.sidebar} ${className || ""}`}>

      {/* TOP IMAGE SECTION */}
      <div className={styles.top_section}>
        <div className={styles.scrolling_bg}></div>
      </div>

      {/* MIDDLE BRAND SECTION */}
      <div className={styles.middle_section}>
        <div className={styles.brand}>
          <h3>Designed by</h3>
          <h2>Temoojeen</h2>
        </div>
      </div>

      {/* BOTTOM IMAGE SECTION */}
      <div className={styles.bottom_section}>
        <div className={styles.scrolling_bg}></div>
      </div>

    </aside>
  );
};

export default SideBar;
