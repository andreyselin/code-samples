/*
 * Nest.JS service with top-level business logic for 
 * buying subscription as non-authorized user (and as authorized later)
 * Main method is createOrder
 * The implementation is minimal, some parts simplified for early production usage
 */

@Injectable()
export class CreateOrderService {
  constructor(
    private startSubscriptionBusinessService: StartSubscriptionBusinessService,
    private purchasesCommercialService: PurchasesCommercialService,
    private commonOtpLogicBusinessService: CommonOtpLogicBusinessService,
  ) {}

  private isPromoCodeValid(promoCode: string | null): boolean {
    return promoCode === 'CODE1';
  }

  private async recalculateCart(cart: ExpectedCartStructure): Promise<ExpectedCartStructure> {
    // This has to be recalculated and compared to passed cart
    return cart;
  }

  private validateUserDetails(userDetails: UserDetails): null {
    const validationResult = userDetailsScheme.validate(userDetails);
    if (validationResult.error) {
      throw new Exception2({
        exceptionKey: 'invalidUserDetails',
        data: { userDetails },
      });
    }
    return null;
  }

  async createOrderAsUnauthorized({
    email,
    ...rest
  }: CreateOrderAsUnauthorizedRequestParams) {
    this.logger.info({ key: 'CreateOrderService.createOrderAsUnauthorized:start', details: { email } });

    const { createdUserId } = await this.commonOtpLogicBusinessService
      .createUserAndAuthMethodByEmailOrFail(email);

    this.logger.info({ key: 'CreateOrderService.createOrderAsUnauthorized:userCreated', details: { createdUserId } });  

    return this.createOrder({
      userId: asNonNullish(createdUserId),
      ...rest,
    })
  }

  private async createOrder({
    userId,
    cart: cartToRecalculate,
    userDetails,
    promoCode,
  }: CreateOrderUnifiedParams) {

    this.logger.info({ key: 'CreateOrderService.createOrder:start', details: { userId, cart, userDetails, promoCode } });

    /* * * * * * * * * * * * * * * */
    /*                             */
    /*   Checking and validation   */
    /*                             */
    /* * * * * * * * * * * * * * * */

    this.validateUserDetails(userDetails);
    const checkedCart = await this.recalculateCart(cartToRecalculate);

    /* * * * * * * * * * * * */
    /*                       */
    /*   Init subscription   */
    /*                       */
    /* * * * * * * * * * * * */

    const subscriptionTypeKey = this.isPromoCodeValid(promoCode)
      ? customSubscriptionTypeKeys.trial
      : customSubscriptionTypeKeys.common;

    this.logger.info({ key: 'CreateOrderService.createOrder:subscriptionType', details: { userId, subscriptionTypeKey } });

    const subscription = await this.startSubscriptionBusinessService.initiateSubscription({
      subscriptionTypeKey,
      userId,
      cart: checkedCart,
      userDetails,
    });

    /* * * * * * * * * * * */
    /*                     */
    /*   Create payment    */
    /*                     */
    /* * * * * * * * * * * */

    const initPurchaseParams: InitPurchaseParams = {
      userId,
      goodId: subscription.id,
      currencyIsoCode: 'EUR',
      priceInCents: subscription.price.amount * 100,
      acquiringProviderKey: acquiringProviderKeys.STRIPE_RECURSIVE_INTENT,
    };


    this.logger.info({ key: 'CreateOrderService.createOrder:initPurchaseParams', details: { userId, initPurchaseParams } });

    const initiatePurchaseResult = await this.purchasesCommercialService
      .initPurchase(initPurchaseParams);

    this.logger.info({ key: 'CreateOrderService.createOrder:initPurchaseParams', details: { userId, initiatePurchaseResult } });

    return initiatePurchaseResult;
  }
}
