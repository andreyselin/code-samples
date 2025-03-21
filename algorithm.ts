/*
Iterator-based algorhytm for calculating cart total price basing on list for rules
The rules are assigned and prioritized, then executed in asyncronous
sequence passing their results forward  
*/

export class CartAlgorithm<CalculationData extends Record<string, unknown>> {
  rules: CartRule<CalculationData>[] = [];

  addRules (newRules: CartRule<CalculationData>[] = []) {
    const sortedRules = newRules.sort((a, b) => a.priority - b.priority);

    for (let i = 0; i < sortedRules.length - 2; i ++) {
      if (sortedRules[i].priority === sortedRules[i + 1].priority) {
        throw new Error(`Same rule priorities: ${sortedRules[i].constructor.name}, ${sortedRules[i + 1].constructor.name}`);
      }
    }

    this.rules = sortedRules;
  }

  async calculate(
    cartCalculationRequestParams: CartCalculationRequestParams,
    providers: CartAlgorithmProviders,
  ): Promise<CompleteCartCalculationState<CalculationData>> {
    if (this.rules.length === 0) {
      throw new Error('Rules array is empty');
    }

    let cartCalculationState: CartCalculationState<CalculationData> = {
      cartCalculationRequestParams,
      cartStructure: {},
      calculationData: {},
    }

    for (let rule of this.rules) {
      cartCalculationState = await this.applyRuleResult({ rule, cartCalculationState, providers });
    }

    if (!this.checkIfCartStructureIsComplete(cartCalculationState.cartStructure)) {
      throw new Error('Cart is not complete');
    }

    return {
      ...cartCalculationState,
      cartStructure: cartCalculationState.cartStructure, // Crazy because type guard doesn't work otherwise
    };
  }

  // This is the only place where state is mutated
  async applyRuleResult({ cartCalculationState, rule, providers }: {
    cartCalculationState: CartCalculationState<CalculationData>,
    rule: CartRule<CalculationData>,
    providers: CartAlgorithmProviders,
  }) {
    const {
      cartCalculationRequestParams,
      cartStructure,
      calculationData,
    } = await rule.run(cartCalculationState, providers);

    const updateCartCalculationState: CartCalculationState<CalculationData> = {
      ...cartCalculationState,
    };

    // Update last state with
    // changes returned from rule:
    if (cartCalculationRequestParams) {
      updateCartCalculationState.cartCalculationRequestParams = cartCalculationRequestParams;
    }

    if (cartStructure) {
      updateCartCalculationState.cartStructure = cartStructure;
    }

    if (calculationData) {
      updateCartCalculationState.calculationData = calculationData;
    }

    // Todo: Add to list of states
    //  stored on each stage, for debug

    return updateCartCalculationState;
  }

  checkIfCartStructureIsComplete(cartStructure: Partial<CartStructure2>): cartStructure is CartStructure2 {
    return true; // Todo
  }

}

