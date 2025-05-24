import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as utils from '../utils';

class BalanceOutput extends Component {
  render() {
    if (!this.props.userInput.format) {
      return null;
    }

    return (
      <div className='output'>
        <p>
          Total Debit: {this.props.totalDebit} Total Credit: {this.props.totalCredit}
          <br />
          Balance from account {this.props.userInput.startAccount || '*'}
          {' '}
          to {this.props.userInput.endAccount || '*'}
          {' '}
          from period {utils.dateToString(this.props.userInput.startPeriod)}
          {' '}
          to {utils.dateToString(this.props.userInput.endPeriod)}
        </p>
        {this.props.userInput.format === 'CSV' ? (
          <pre>{utils.toCSV(this.props.balance)}</pre>
        ) : null}
        {this.props.userInput.format === 'HTML' ? (
          <table className="table">
            <thead>
              <tr>
                <th>ACCOUNT</th>
                <th>DESCRIPTION</th>
                <th>DEBIT</th>
                <th>CREDIT</th>
                <th>BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {this.props.balance.map((entry, i) => (
                <tr key={i}>
                  <th scope="row">{entry.ACCOUNT}</th>
                  <td>{entry.DESCRIPTION}</td>
                  <td>{entry.DEBIT}</td>
                  <td>{entry.CREDIT}</td>
                  <td>{entry.BALANCE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    );
  }
}

BalanceOutput.propTypes = {
  balance: PropTypes.arrayOf(
    PropTypes.shape({
      ACCOUNT: PropTypes.number.isRequired,
      DESCRIPTION: PropTypes.string.isRequired,
      DEBIT: PropTypes.number.isRequired,
      CREDIT: PropTypes.number.isRequired,
      BALANCE: PropTypes.number.isRequired
    })
  ).isRequired,
  totalCredit: PropTypes.number.isRequired,
  totalDebit: PropTypes.number.isRequired,
  userInput: PropTypes.shape({
    startAccount: PropTypes.number,
    endAccount: PropTypes.number,
    startPeriod: PropTypes.date,
    endPeriod: PropTypes.date,
    format: PropTypes.string
  }).isRequired
};

export default connect(state => {
  let balance = [];

  const { startAccount, endAccount, startPeriod, endPeriod } = state.userInput;

  // Fallbacks for wildcard (*) values
  const accMin = isNaN(startAccount) ? 0 : startAccount;
  const accMax = isNaN(endAccount) ? Infinity : endAccount;

  const dateMin =
    startPeriod instanceof Date && !isNaN(startPeriod)
      ? startPeriod
      : new Date(-8640000000000000);
  const dateMax =
    endPeriod instanceof Date && !isNaN(endPeriod)
      ? endPeriod
      : new Date(8640000000000000);

  // Range filters for accounts and periods
  const isAccountInRange = acc => acc >= accMin && acc <= accMax;
  const isDateInRange = date => date >= dateMin && date <= dateMax;

  // Create a lookup map for valid accounts and their labels
  const accountMap = new Map(
    state.accounts.map(({ ACCOUNT, LABEL }) => [ACCOUNT, LABEL])
  );

  // Filter journal entries that match both account and period range
  // and ensure the account exists in the account list
  const filteredEntries = state.journalEntries.filter(
    ({ ACCOUNT, PERIOD }) =>
      isAccountInRange(ACCOUNT) &&
      isDateInRange(PERIOD) &&
      accountMap.has(ACCOUNT)
  );

  // Aggregate debits and credits by account
  const aggregated = new Map();
  for (const { ACCOUNT, DEBIT, CREDIT } of filteredEntries) {
    if (!aggregated.has(ACCOUNT)) {
      aggregated.set(ACCOUNT, { DEBIT: 0, CREDIT: 0 });
    }
    const current = aggregated.get(ACCOUNT);
    current.DEBIT += DEBIT;
    current.CREDIT += CREDIT;
  }

  // Format result with DESCRIPTION and BALANCE,
  // sorted by account number
  balance = Array.from(aggregated.entries())
    .map(([ACCOUNT, { DEBIT, CREDIT }]) => ({
      ACCOUNT,
      DESCRIPTION: accountMap.get(ACCOUNT),
      DEBIT,
      CREDIT,
      BALANCE: DEBIT - CREDIT
    }))
    .sort((a, b) => a.ACCOUNT - b.ACCOUNT);

  const totalCredit = balance.reduce((acc, entry) => acc + entry.CREDIT, 0);
  const totalDebit = balance.reduce((acc, entry) => acc + entry.DEBIT, 0);

  return {
    balance,
    totalCredit,
    totalDebit,
    userInput: state.userInput
  };
})(BalanceOutput);
