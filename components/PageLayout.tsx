import React from 'react';

interface PageLayoutProps {
    header?: React.ReactNode;
    children: React.ReactNode;
    bottomNav?: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ header, children, bottomNav }) => {
    return (
        <div className="flex flex-col h-full w-full bg-background-light dark:bg-background-dark overflow-hidden">
            {/* Fixed Header Area */}
            {header && <div className="flex-none z-50">{header}</div>}

            {/* Scrollable Content Area */}
            {/* flex-1 takes remaining space. overflow-y-auto allows scroll. relative for positioning context. */}
            {/* overflow-x-hidden prevents horizontal scroll. */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden relative w-full min-h-0">
                <div className={`min-h-full ${bottomNav ? 'pb-[72px]' : ''}`}>
                    {children}
                </div>
            </main>

            {/* Fixed Bottom Nav Area */}
            {bottomNav && <div className="flex-none z-50">{bottomNav}</div>}
        </div>
    );
};
