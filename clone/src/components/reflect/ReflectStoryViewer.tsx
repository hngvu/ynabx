import React, { useState } from 'react';
import { SPENDING_BREAKDOWN_STORIES, ReflectStoryState } from './reflectFixtures';
import { SpendingBreakdownView } from './SpendingBreakdownView';
import { SpendingTrendsView } from './SpendingTrendsView';
import { NetWorthView } from './NetWorthView';
import { IncomeExpenseView } from './IncomeExpenseView';
import { AgeOfMoneyView } from './AgeOfMoneyView';

export const ReflectStoryViewer: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [selectedStoryId, setSelectedStoryId] = useState<string>(SPENDING_BREAKDOWN_STORIES[0].id);
  const [viewMode, setViewMode] = useState<'single' | 'stacked'>('single');

  const currentStory = SPENDING_BREAKDOWN_STORIES.find(s => s.id === selectedStoryId) || SPENDING_BREAKDOWN_STORIES[0];

  function renderStoryContent(story: ReflectStoryState) {
    const key = `${story.screen}-${story.id}`;
    switch (story.screen) {
      case 'spending-breakdown':
        return (
          <SpendingBreakdownView
            key={key}
            data={story.data}
            conditions={{ singleColumn: false, ...story.conditions }}
          />
        );
      case 'spending-trends':
        return <SpendingTrendsView key={key} data={story.data || undefined} isEmpty={Boolean(story.conditions?.isEmpty)} />;
      case 'net-worth':
        return <NetWorthView key={key} data={story.data || undefined} isEmpty={Boolean(story.conditions?.isEmpty)} />;
      case 'income-expense':
        return <IncomeExpenseView key={key} data={story.data || undefined} />;
      case 'age-of-money':
        return <AgeOfMoneyView key={key} data={story.data || undefined} isEmpty={Boolean(story.conditions?.isEmpty)} />;
      default:
        return null;
    }
  }

  function renderWrappedStoryContent(story: ReflectStoryState) {
    const isIncomeExpense = story.screen === 'income-expense';
    return (
      <div className={`reports-header-top ${!isIncomeExpense ? 'content-min-break' : ''}`}>
        <div
          className={`reflect-container ${isIncomeExpense ? 'reflect-income-expense-container' : ''}`}
          style={{ minHeight: 'auto' }}
        >
          <div className="reflect-content">
            {renderStoryContent(story)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8f9fa', fontFamily: 'system-ui, sans-serif' }}>
      {/* Story Sidebar */}
      <div style={{ width: 340, background: '#fff', borderRight: '1px solid #e1e4e8', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e1e4e8', background: '#1c3d5a', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Reflect Story Matrix</h3>
            <button
              onClick={onExit}
              style={{ background: 'transparent', border: '1px solid #fff', color: '#fff', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}
            >
              Exit
            </button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.85 }}>
            Visual Condition Table Verification
          </p>
        </div>

        {/* View Mode Toggle */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #e1e4e8', display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setViewMode('single')}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: 4,
              border: '1px solid #ccc',
              background: viewMode === 'single' ? '#0070f3' : '#fff',
              color: viewMode === 'single' ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12
            }}
          >
            Single Story
          </button>
          <button
            type="button"
            onClick={() => setViewMode('stacked')}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: 4,
              border: '1px solid #ccc',
              background: viewMode === 'stacked' ? '#0070f3' : '#fff',
              color: viewMode === 'stacked' ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12
            }}
          >
            All Stacked ({SPENDING_BREAKDOWN_STORIES.length})
          </button>
        </div>

        {/* Story List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {[
            { title: 'Spending Breakdown (14 Branches)', screen: 'spending-breakdown' },
            { title: 'Spending Trends (2 Branches)', screen: 'spending-trends' },
            { title: 'Net Worth (2 Branches)', screen: 'net-worth' },
            { title: 'Income v Expense (1 Branch)', screen: 'income-expense' },
            { title: 'Age of Money (2 Branches)', screen: 'age-of-money' }
          ].map(group => {
            const stories = SPENDING_BREAKDOWN_STORIES.filter(s => s.screen === group.screen);
            if (stories.length === 0) return null;
            return (
              <div key={group.screen} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', padding: '6px 8px', textTransform: 'uppercase' }}>
                  {group.title}
                </div>
                {stories.map(s => {
                  const globalIdx = SPENDING_BREAKDOWN_STORIES.findIndex(item => item.id === s.id);
                  const isSelected = selectedStoryId === s.id && viewMode === 'single';
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedStoryId(s.id);
                        setViewMode('single');
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 6,
                        marginBottom: 4,
                        cursor: 'pointer',
                        background: isSelected ? '#e6f0fa' : '#fff',
                        border: isSelected ? '1px solid #0070f3' : '1px solid transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, background: '#ddd', padding: '1px 5px', borderRadius: 10, fontWeight: 700 }}>
                          #{globalIdx + 1}
                        </span>
                        <strong style={{ fontSize: 13, color: isSelected ? '#0070f3' : '#222' }}>{s.title}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{s.description}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Preview Container */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {viewMode === 'single' ? (
          <div>
            {/* Condition Banner */}
            <div style={{ background: '#fff', borderBottom: '1px solid #e1e4e8', padding: '12px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>{currentStory.title}</h2>
                <span style={{ fontSize: 12, fontFamily: 'monospace', background: '#f0f0f0', padding: '3px 8px', borderRadius: 4 }}>
                  ID: {currentStory.id}
                </span>
              </div>
              <p style={{ margin: '4px 0 8px', fontSize: 13, color: '#555' }}>{currentStory.description}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(currentStory.conditions).map(([k, v]) => (
                  <span
                    key={k}
                    style={{
                      fontSize: 11,
                      fontFamily: 'monospace',
                      background: '#eef3f8',
                      color: '#0366d6',
                      padding: '2px 6px',
                      borderRadius: 3
                    }}
                  >
                    {k}: {String(v)}
                  </span>
                ))}
              </div>
            </div>

            {/* Viewport Preview */}
            <div style={{ padding: 24 }}>
              <div style={{ borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                {renderWrappedStoryContent(currentStory)}
              </div>
            </div>
          </div>
        ) : (
          /* Stacked View of All Stories */
          <div style={{ padding: 24 }}>
            {SPENDING_BREAKDOWN_STORIES.map((s, idx) => (
              <div
                key={s.id}
                style={{
                  background: '#fff',
                  borderRadius: 8,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  marginBottom: 32,
                  overflow: 'hidden'
                }}
              >
                <div style={{ background: '#f4f6f8', borderBottom: '1px solid #e1e4e8', padding: '12px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>
                      #{idx + 1}: {s.title}
                    </h3>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', background: '#e1e4e8', padding: '2px 6px', borderRadius: 3 }}>
                      {s.id}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>{s.description}</p>
                </div>
                <div>
                  {renderWrappedStoryContent(s)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
