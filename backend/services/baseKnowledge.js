'use strict';

// Starter knowledge every brain ships with, so nobody ever hits "I don't know" on a basic question.
// General education only: no rates, no approvals, no personal advice. Each person's own brain
// (their rates, their FAQs, their bio) is added on top and always wins.

const LOAN_BASICS = `GENERAL MORTGAGE BASICS (platform-approved education; use it to answer general questions, then offer the loan officer for the buyer's own situation):
Loan types, in plain words:
- Conventional: not backed by the government. Usually needs steady income and solid credit. Down payments can often be low (commonly 3 to 5 percent), and putting down less than 20 percent usually means private mortgage insurance (PMI), which can often be removed later.
- FHA: insured by the government, with more flexible credit rules and a smaller down payment (as low as 3.5 percent for qualifying buyers). It has mortgage insurance premiums, an upfront one and a monthly one.
- VA: for eligible veterans, active-duty service members and some surviving spouses. Often no down payment and no monthly mortgage insurance. There is usually a one-time VA funding fee (some people are exempt). The buyer needs a Certificate of Eligibility, which the loan officer can help get.
- USDA: for eligible rural and some suburban areas, with income limits. Often no down payment, with a guarantee fee.
- Jumbo: for loan amounts above the standard limits, which vary by county and year. Usually stricter on credit, savings and down payment.
- Fixed rate keeps the same rate for the whole loan. An adjustable rate (ARM) starts with a set period and can change after that.
- First-time buyer and down payment assistance programs exist in many states and counties. Availability varies, so the loan officer is the one to check.
Steps and terms:
- Pre-qualification is a quick estimate from information the buyer gives. Pre-approval is stronger: the lender reviews credit, income, assets and documents. Neither is a promise to lend, but a pre-approval makes an offer more credible.
- Documents usually asked for: photo ID, recent pay stubs, W-2s or tax returns for the last two years, and recent bank statements. Self-employed buyers usually need more, such as profit and loss statements.
- Debt-to-income ratio (DTI) compares monthly debts to monthly income. Lenders use it with credit and savings to decide what a buyer can borrow.
- Credit score matters, but the minimum depends on the loan type and the lender. A lower score does not always mean no, so the loan officer should look at the full picture.
- Costs to expect: down payment, closing costs (these vary, often a few percent of the price), earnest money with the offer, and usually an appraisal and an inspection. Some programs let the seller or a gift help with costs.
- From signed contract to closing commonly takes several weeks. Exact timing depends on the lender, appraisal and paperwork, and can never be promised.
- Tips: do not open new credit, change jobs, or move large amounts of money without talking to the loan officer first.
How to use this: explain the idea in two or three plain sentences, say it varies by lender and situation, and offer a call with the loan officer for the buyer's own numbers. Never give a rate, never say someone will be approved, never give legal or tax advice.`;

const HOME_BUYING_BASICS = `GENERAL HOME-BUYING BASICS (use for general questions; for details about THIS home use only the listing facts):
- Making an offer: the buyer's agent writes an offer with the price, deposit (earnest money), closing date and conditions. The seller can accept, counter or decline.
- Earnest money is a deposit that shows the buyer is serious. It usually counts toward the buyer's costs at closing.
- Common conditions (contingencies): inspection, appraisal and financing. They let the buyer adjust or step away under the terms of the contract.
- Home inspection: a professional looks at the roof, foundation, plumbing, electrical and more, and writes a report. It is the buyer's chance to learn about repairs.
- Appraisal: the lender's independent estimate of the home's value. It protects the lender and the buyer.
- Before touring or offering, buyers usually get a mortgage pre-approval so they know their range.
- Closing: the final steps where papers are signed, funds move and the keys change hands. Costs at closing vary.
- "As-is" means the seller will not make repairs, but the buyer can still inspect.
- An HOA, if there is one, charges regular dues and has rules. The listing facts say whether this home has one.
How to use this: answer in two or three plain sentences, then offer to have the agent follow up for specifics. Do not give legal advice, and never guess about this home's price history, HOA, taxes or disclosures.`;

module.exports = { LOAN_BASICS, HOME_BUYING_BASICS };
