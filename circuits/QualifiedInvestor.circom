pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";

template QualifiedInvestor() {
    signal input assetAmount;
    signal input threshold;
    signal output qualified;

    component geq = GreaterEqThan(64);
    geq.in[0] <== assetAmount;
    geq.in[1] <== threshold;

    qualified <== geq.out;
    qualified === 1;
}

component main = QualifiedInvestor();
