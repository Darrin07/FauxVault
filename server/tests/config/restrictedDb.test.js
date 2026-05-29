const { restrictedPool } = require('../../src/config/restrictedDb');

describe('restrictedPool', () => {
  test('can SELECT from transactions', async () => {
    const result = await restrictedPool.query('SELECT count(*) AS n FROM transactions');
    expect(Number(result.rows[0].n)).toBeGreaterThanOrEqual(0);
  });

  test('cannot SELECT from users', async () => {
    await expect(
      restrictedPool.query('SELECT * FROM users LIMIT 1')
    ).rejects.toThrow(/permission denied/i);
  });

  test('cannot DROP transactions', async () => {
    await expect(
      restrictedPool.query('DROP TABLE transactions')
    ).rejects.toThrow(/permission denied|must be owner/i);
  });
});
