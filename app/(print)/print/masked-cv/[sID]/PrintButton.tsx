'use client';
export default function PrintButton() {
  return <div className="mb-6 flex justify-end print:hidden"><button className="btn-primary" onClick={() => window.print()}>Print / save as PDF</button></div>;
}
