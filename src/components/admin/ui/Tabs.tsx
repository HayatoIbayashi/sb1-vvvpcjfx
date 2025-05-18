import React, { useState } from 'react';

interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}

interface CommonProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsListProps extends CommonProps {}
interface TabsTriggerProps extends CommonProps {
  value: string;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}
interface TabsContentProps extends CommonProps {
  value: string;
  activeTab?: string;
}

export function Tabs({ defaultValue, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultValue || '');

  const renderChildren = (children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, child => {
      if (!React.isValidElement(child)) return child;

      if (child.type === TabsList) {
        const listChild = child as React.ReactElement<TabsListProps>;
        return React.cloneElement(listChild, {
          children: renderChildren(listChild.props.children)
        });
      }

      if (child.type === TabsTrigger) {
        const triggerChild = child as React.ReactElement<TabsTriggerProps>;
        return React.cloneElement(triggerChild, {
          ...triggerChild.props,
          activeTab,
          setActiveTab,
          onClick: () => setActiveTab?.(triggerChild.props.value)
        } as Partial<TabsTriggerProps>);
      }

      if (child.type === TabsContent) {
        const contentChild = child as React.ReactElement<TabsContentProps>;
        return React.cloneElement(contentChild, {
          ...contentChild.props,
          activeTab
        } as Partial<TabsContentProps>);
      }

      return child;
    });
  };

  return (
    <div className={`tabs ${className}`} data-active-tab={activeTab}>
      {renderChildren(children)}
    </div>
  );
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={`flex space-x-2 border-b border-dark-light ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ 
  value, 
  children, 
  activeTab, 
  setActiveTab,
  className = '',
  ...props 
}: TabsTriggerProps & { 
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}) {
  const isActive = activeTab === value;
  
  return (
    <button
      className={`px-4 py-2 font-medium transition-colors ${
        isActive 
          ? 'text-primary border-b-2 border-primary' 
          : 'text-gray-400 hover:text-white'
      }`}
      onClick={() => setActiveTab?.(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ 
  value, 
  children, 
  activeTab,
  className = '',
  ...props 
}: TabsContentProps & { 
  activeTab?: string 
}) {
  if (activeTab !== value) return null;
  
  return <div className="pt-6">{children}</div>;
}
