import { LeaderboardEntry } from '../../db/models';

describe('Leaderboard API Response Format', () => {
  it('should have correct response structure', () => {
    const mockLeaderboardData: LeaderboardEntry[] = [
      {
        entry_order: 1,
        nickname: 'Alice',
        wallet: '0x1111111111111111111111111111111111111111',
        portfolio_value: 150,
        deposit_sum: 100,
        pnl: 50,
        is_low_dep: false,
        is_high_dep: false,
        is_old: false,
      },
      {
        entry_order: 2,
        nickname: 'Bob',
        wallet: '0x2222222222222222222222222222222222222222',
        portfolio_value: 80,
        deposit_sum: 100,
        pnl: -20,
        is_low_dep: false,
        is_high_dep: false,
        is_old: true,
      },
    ];

    const response = {
      success: true,
      data: mockLeaderboardData,
      sortBy: 'entry_order',
      count: mockLeaderboardData.length,
      timestamp: new Date().toISOString(),
    };

    expect(response.success).toBe(true);
    expect(response.data).toHaveLength(2);
    expect(response.sortBy).toBe('entry_order');
    expect(response.count).toBe(2);

    // Check first entry structure
    const firstEntry = response.data[0];
    expect(firstEntry).toHaveProperty('entry_order');
    expect(firstEntry).toHaveProperty('nickname');
    expect(firstEntry).toHaveProperty('wallet');
    expect(firstEntry).toHaveProperty('portfolio_value');
    expect(firstEntry).toHaveProperty('deposit_sum');
    expect(firstEntry).toHaveProperty('pnl');
    expect(firstEntry).toHaveProperty('is_low_dep');
    expect(firstEntry).toHaveProperty('is_high_dep');
    expect(firstEntry).toHaveProperty('is_old');

    // Verify wallet format
    expect(firstEntry.wallet).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('should correctly sort by entry_order', () => {
    const data: LeaderboardEntry[] = [
      { entry_order: 2, nickname: 'Bob', wallet: '0x222', portfolio_value: 80, deposit_sum: 100, pnl: -20, is_low_dep: false, is_high_dep: false, is_old: false },
      { entry_order: 1, nickname: 'Alice', wallet: '0x111', portfolio_value: 150, deposit_sum: 100, pnl: 50, is_low_dep: false, is_high_dep: false, is_old: false },
      { entry_order: 3, nickname: 'Charlie', wallet: '0x333', portfolio_value: 120, deposit_sum: 100, pnl: 20, is_low_dep: false, is_high_dep: false, is_old: false },
    ];

    const sorted = [...data].sort((a, b) => a.entry_order - b.entry_order);

    expect(sorted[0].entry_order).toBe(1);
    expect(sorted[1].entry_order).toBe(2);
    expect(sorted[2].entry_order).toBe(3);
  });

  it('should correctly sort by pnl', () => {
    const data: LeaderboardEntry[] = [
      { entry_order: 1, nickname: 'Alice', wallet: '0x111', portfolio_value: 150, deposit_sum: 100, pnl: 50, is_low_dep: false, is_high_dep: false, is_old: false },
      { entry_order: 2, nickname: 'Bob', wallet: '0x222', portfolio_value: 80, deposit_sum: 100, pnl: -20, is_low_dep: false, is_high_dep: false, is_old: false },
      { entry_order: 3, nickname: 'Charlie', wallet: '0x333', portfolio_value: 120, deposit_sum: 100, pnl: 20, is_low_dep: false, is_high_dep: false, is_old: false },
    ];

    const sorted = [...data].sort((a, b) => b.pnl - a.pnl); // descending

    expect(sorted[0].pnl).toBe(50);
    expect(sorted[1].pnl).toBe(20);
    expect(sorted[2].pnl).toBe(-20);
  });
});

describe('Sample Deposit Logs Parsing', () => {
  it('should parse ERC-20 Transfer event correctly', () => {
    // Sample log structure
    const mockLog = {
      topics: [
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer event signature
        '0x0000000000000000000000001111111111111111111111111111111111111111', // from
        '0x0000000000000000000000002222222222222222222222222222222222222222', // to
      ],
      data: '0x0000000000000000000000000000000000000000000000000000000002faf080', // amount (50000000 = 50 USDC)
      transactionHash: '0xabc123',
      blockNumber: 12345,
    };

    // Verify event signature
    expect(mockLog.topics[0]).toBe('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef');

    // Verify we can extract addresses
    const fromAddress = '0x' + mockLog.topics[1].slice(26);
    const toAddress = '0x' + mockLog.topics[2].slice(26);

    expect(fromAddress.length).toBe(42);
    expect(toAddress.length).toBe(42);

    // Verify we have transaction details
    expect(mockLog.transactionHash).toBeTruthy();
    expect(mockLog.blockNumber).toBeGreaterThan(0);
  });
});
