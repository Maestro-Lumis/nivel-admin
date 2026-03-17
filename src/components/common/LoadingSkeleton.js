import React from 'react';
import './LoadingSkeleton.css';

function LoadingSkeleton({ rows = 10 }) {
    return (
        <div className="skeleton-table">
            <div className="skeleton-header">
                <div className="skeleton-cell skeleton-shimmer" style={{ width: '80px' }}></div>
                <div className="skeleton-cell skeleton-shimmer" style={{ width: '200px' }}></div>
                <div className="skeleton-cell skeleton-shimmer" style={{ width: '200px' }}></div>
                <div className="skeleton-cell skeleton-shimmer" style={{ width: '100px' }}></div>
                <div className="skeleton-cell skeleton-shimmer" style={{ width: '150px' }}></div>
            </div>
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="skeleton-row">
                    <div className="skeleton-cell skeleton-shimmer" style={{ width: '60px' }}></div>
                    <div className="skeleton-cell skeleton-shimmer" style={{ width: '180px' }}></div>
                    <div className="skeleton-cell skeleton-shimmer" style={{ width: '180px' }}></div>
                    <div className="skeleton-cell skeleton-shimmer" style={{ width: '80px' }}></div>
                    <div className="skeleton-cell skeleton-shimmer" style={{ width: '120px' }}></div>
                </div>
            ))}
        </div>
    );
}

export default LoadingSkeleton;