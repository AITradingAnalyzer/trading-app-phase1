import React from 'react';

const Footer = () => {
  return (
    <footer
      style={{
        textAlign: 'center',
        padding: '16px',
        marginTop: '40px',
        borderTop: '1px solid #e0e0e0',
        color: '#888',
        fontSize: '14px',
        fontFamily: 'sans-serif',
      }}
    >
      © {new Date().getFullYear()} Waseem. All rights reserved.
    </footer>
  );
};

export default Footer;