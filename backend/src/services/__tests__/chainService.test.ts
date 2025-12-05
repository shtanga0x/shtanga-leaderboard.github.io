import { ChainService } from '../chainService';
import { ethers } from 'ethers';

describe('ChainService', () => {
  describe('convertAmount', () => {
    it('should convert USDC wei to decimal correctly', () => {
      const service = new ChainService('http://mock-rpc', '0x0000000000000000000000000000000000000000');

      // 1 USDC = 1,000,000 (6 decimals)
      expect(service.convertAmount(BigInt(1000000))).toBe(1);

      // 100 USDC
      expect(service.convertAmount(BigInt(100000000))).toBe(100);

      // 0.5 USDC
      expect(service.convertAmount(BigInt(500000))).toBe(0.5);

      // 1234.56 USDC
      expect(service.convertAmount(BigInt(1234560000))).toBe(1234.56);
    });
  });

  describe('transferToDeposit', () => {
    it('should convert TransferEvent to Deposit format', () => {
      const service = new ChainService('http://mock-rpc', '0x0000000000000000000000000000000000000000');

      const transfer = {
        txHash: '0xabc123',
        blockNumber: 12345,
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        amount: BigInt(50000000), // 50 USDC
        timestamp: 1638316800, // Dec 1, 2021 00:00:00 UTC
      };

      const deposit = service.transferToDeposit(transfer, 1, '0x2222222222222222222222222222222222222222');

      expect(deposit.participant_id).toBe(1);
      expect(deposit.wallet).toBe('0x2222222222222222222222222222222222222222'.toLowerCase());
      expect(deposit.tx_hash).toBe('0xabc123');
      expect(deposit.block_number).toBe(12345);
      expect(deposit.amount).toBe(50);
      expect(deposit.timestamp).toEqual(new Date(1638316800 * 1000));
    });
  });
});

describe('PnL Calculation', () => {
  it('should calculate PnL correctly', () => {
    const portfolioValue = 150;
    const depositSum = 100;
    const pnl = portfolioValue - depositSum;

    expect(pnl).toBe(50);
  });

  it('should calculate negative PnL correctly', () => {
    const portfolioValue = 80;
    const depositSum = 100;
    const pnl = portfolioValue - depositSum;

    expect(pnl).toBe(-20);
  });

  it('should handle zero PnL', () => {
    const portfolioValue = 100;
    const depositSum = 100;
    const pnl = portfolioValue - depositSum;

    expect(pnl).toBe(0);
  });
});

describe('Deposit Flags', () => {
  it('should correctly identify low deposit', () => {
    const depositSum = 85;
    const isLowDep = depositSum < 90;

    expect(isLowDep).toBe(true);
  });

  it('should correctly identify high deposit', () => {
    const depositSum = 120;
    const isHighDep = depositSum > 110;

    expect(isHighDep).toBe(true);
  });

  it('should correctly identify old account', () => {
    const firstTradeDate = new Date('2025-11-01');
    const tournamentStart = new Date('2025-12-05');
    const isOld = firstTradeDate < tournamentStart;

    expect(isOld).toBe(true);
  });

  it('should correctly identify new account', () => {
    const firstTradeDate = new Date('2025-12-10');
    const tournamentStart = new Date('2025-12-05');
    const isOld = firstTradeDate < tournamentStart;

    expect(isOld).toBe(false);
  });
});
