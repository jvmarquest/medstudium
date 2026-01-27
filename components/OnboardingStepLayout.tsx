import React from 'react';

interface OnboardingStepLayoutProps {
    children: React.ReactNode;
    header?: React.ReactNode;
    footer?: React.ReactNode;
    mainClassName?: string;
}

export const OnboardingStepLayout: React.FC<OnboardingStepLayoutProps> = ({
    children,
    header,
    footer,
    mainClassName = ""
}) => {
    return (
        <div className="relative flex h-full w-full max-w-[430px] lg:max-w-none mx-auto flex-col overflow-hidden border-x lg:border-x-0 border-slate-200 dark:border-slate-800 shadow-2xl lg:shadow-none bg-background-light dark:bg-background-dark">

            {/* Header: Usually has its own background/blur, so we just render it. 
                It should NOT be sticky here if the parent is overflow-hidden, 
                it should just be a block element at the top. 
            */}
            {header}

            {/* Main Content: Scrollable area */}
            <main className={`flex-1 overflow-y-auto overflow-x-hidden w-full ${mainClassName}`}>
                {children}
            </main>

            {/* Footer: Always at bottom (flex container flow) */}
            {footer}
        </div>
    );
};
