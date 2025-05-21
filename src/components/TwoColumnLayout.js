import React from 'react';
import { Tabs, Tab } from '@mui/material';
import { useState } from 'react';

const TwoColumnLayout = ({ children }) => {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const tabContent = [
    <div key="1" className="p-4">
      <h2 className="text-xl font-bold mb-4">Tab 1 Content</h2>
      <p>This is the content for Tab 1</p>
    </div>,
    <div key="2" className="p-4">
      <h2 className="text-xl font-bold mb-4">Tab 2 Content</h2>
      <p>This is the content for Tab 2</p>
    </div>,
    <div key="3" className="p-4">
      <h2 className="text-xl font-bold mb-4">Tab 3 Content</h2>
      <p>This is the content for Tab 3</p>
    </div>
  ];

  return (
    <div className="flex h-screen">
      {/* Left column with tabs */}
      <div className="w-64 bg-gray-100 border-r border-gray-200">
        <Tabs
          orientation="vertical"
          value={selectedTab}
          onChange={handleChange}
          className="w-full"
        >
          <Tab label="Tab 1" />
          <Tab label="Tab 2" />
          <Tab label="Tab 3" />
        </Tabs>
      </div>

      {/* Right column with content */}
      <div className="flex-1 p-4">
        {tabContent[selectedTab]}
      </div>
    </div>
  );
};

export default TwoColumnLayout;
