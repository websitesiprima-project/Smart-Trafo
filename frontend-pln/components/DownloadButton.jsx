// File: src/components/DownloadButton.jsx
import React from "react";
import styled from "styled-components";

// Menerima prop 'onClick' agar bisa menjalankan fungsi downloadCSV
const DownloadButton = ({ onClick }) => {
  return (
    <StyledWrapper>
      <button className="Btn" onClick={onClick} title="Download CSV">
        <svg
          className="svgIcon"
          viewBox="0 0 384 512"
          height="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z" />
        </svg>
        <span className="icon2" />
        <span className="tooltip">Download</span>
      </button>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .Btn {
    width: 45px; /* Saya kecilkan sedikit dari 50px agar pas di header */
    height: 45px;
    border: none;
    border-radius: 50%;
    background-color: rgb(27, 27, 27);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    transition-duration: 0.3s;
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.11);
  }

  .svgIcon {
    fill: rgb(214, 178, 255);
  }

  .icon2 {
    width: 18px;
    height: 5px;
    border-bottom: 2px solid rgb(182, 143, 255);
    border-left: 2px solid rgb(182, 143, 255);
    border-right: 2px solid rgb(182, 143, 255);
  }

  .tooltip {
    position: absolute;
    right: -105px;
    opacity: 0;
    background-color: rgb(12, 12, 12);
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition-duration: 0.2s;
    pointer-events: none;
    letter-spacing: 0.5px;
    font-size: 12px;
    z-index: 50;
  }

  .tooltip::before {
    position: absolute;
    content: "";
    width: 10px;
    height: 10px;
    background-color: rgb(12, 12, 12);
    background-size: 1000%;
    background-position: center;
    transform: rotate(45deg);
    left: -5%;
    transition-duration: 0.3s;
  }

  .Btn:hover .tooltip {
    opacity: 1;
    transition-duration: 0.3s;
  }

  .Btn:hover {
    background-color: rgb(150, 94, 255);
    transition-duration: 0.3s;
  }

  .Btn:hover .icon2 {
    border-bottom: 2px solid rgb(235, 235, 235);
    border-left: 2px solid rgb(235, 235, 235);
    border-right: 2px solid rgb(235, 235, 235);
  }

  .Btn:hover .svgIcon {
    fill: rgb(255, 255, 255);
    animation: slide-in-top 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  }

  @keyframes slide-in-top {
    0% {
      transform: translateY(-10px);
      opacity: 0;
    }

    100% {
      transform: translateY(0px);
      opacity: 1;
    }
  }
`;

export default DownloadButton;
