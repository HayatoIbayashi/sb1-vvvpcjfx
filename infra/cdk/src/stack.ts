import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class AuthSignupStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Cognito User Pool（メール確認あり、self sign-up 可）
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      userVerification: {
        emailSubject: 'Verify your email for WiiBER',
        emailBody: 'Thanks for signing up! Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
    });

    // App Client（シークレット無し、Hosted UI/PKCE向け）
    const appClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      generateSecret: false,
      authFlows: {
        userPassword: true, // USER_PASSWORD_AUTH を許可（必要に応じて）
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        // Callback/Logout URLs はデプロイ後に設定 or CDKコンテキストで注入
        callbackUrls: ['http://localhost:5173/'],
        logoutUrls: ['http://localhost:5173/'],
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PHONE,
          cognito.OAuthScope.COGNITO_ADMIN,
        ],
      },
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,
    });

    // 既存VPCへ配置（Private Subnet & SG）
    const vpcId = process.env.VPC_ID;
    const lambdaSubnetIds = (process.env.LAMBDA_SUBNET_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    let vpc: ec2.IVpc | undefined;
    if (vpcId) {
      vpc = ec2.Vpc.fromLookup(this, 'ExistingVpc', { vpcId });
    }

    const subnets: ec2.ISubnet[] | undefined = vpc && lambdaSubnetIds.length
      ? lambdaSubnetIds.map((id, i) => ec2.Subnet.fromSubnetId(this, `LambdaSubnet${i + 1}`, id))
      : undefined;

    const lambdaSg = vpc
      ? new ec2.SecurityGroup(this, 'LambdaSg', { vpc, allowAllOutbound: true, description: 'Lambda SG for RDS access' })
      : undefined;

    // 任意: 既存のRDS SGにインバウンド許可を自動付与（提供された場合）
    const rdsSgId = process.env.RDS_SG_ID;
    if (vpc && lambdaSg && rdsSgId) {
      const rdsSg = ec2.SecurityGroup.fromSecurityGroupId(this, 'RdsSg', rdsSgId, { mutable: true });
      rdsSg.addIngressRule(lambdaSg, ec2.Port.tcp(5432), 'Allow Lambda to connect to RDS');
    }

    // Lambda（フロントの lambda/auth-signup/dist を同梱）
    const fn = new lambda.Function(this, 'AuthSignupFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('../../lambda/auth-signup/dist'),
      timeout: Duration.seconds(10),
      memorySize: 256,
      vpc,
      vpcSubnets: subnets ? { subnets } : undefined,
      securityGroups: lambdaSg ? [lambdaSg] : undefined,
      environment: {
        COGNITO_REGION: Stack.of(this).region,
        COGNITO_CLIENT_ID: appClient.userPoolClientId,
        // DATABASE_URL は cdk deploy 時にコンテキストやSSM経由で注入を推奨
        DATABASE_URL: process.env.DATABASE_URL ?? '',
      },
    });

    // HTTP API + ルート
    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      corsPreflight: {
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['*'],
      },
    });

    const integration = new integrations.HttpLambdaIntegration('AuthSignupIntegration', fn);
    httpApi.addRoutes({
      path: '/v1/auth/signup',
      methods: [apigwv2.HttpMethod.POST],
      integration,
    });

    const moviesFn = new lambda.Function(this, 'MoviesListFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('../../lambda/movies/dist'),
      timeout: Duration.seconds(10),
      memorySize: 256,
      vpc,
      vpcSubnets: subnets ? { subnets } : undefined,
      securityGroups: lambdaSg ? [lambdaSg] : undefined,
      environment: {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
      },
    });

    const moviesIntegration = new integrations.HttpLambdaIntegration('MoviesListIntegration', moviesFn);
    httpApi.addRoutes({
      path: '/v1/movies',
      methods: [apigwv2.HttpMethod.GET],
      integration: moviesIntegration,
    });
    httpApi.addRoutes({
      path: '/v1/movies/{id}',
      methods: [apigwv2.HttpMethod.GET],
      integration: moviesIntegration,
    });
    httpApi.addRoutes({
      path: '/v1/admin/movies',
      methods: [apigwv2.HttpMethod.GET],
      integration: moviesIntegration,
    });
    httpApi.addRoutes({
      path: '/v1/admin/movies/{id}',
      methods: [apigwv2.HttpMethod.GET],
      integration: moviesIntegration,
    });
    httpApi.addRoutes({
      path: '/v1/watchlist',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration: moviesIntegration,
    });
    httpApi.addRoutes({
      path: '/v1/watchlist/{movieId}',
      methods: [apigwv2.HttpMethod.DELETE],
      integration: moviesIntegration,
    });
    httpApi.addRoutes({
      path: '/v1/purchases',
      methods: [apigwv2.HttpMethod.GET],
      integration: moviesIntegration,
    });
    httpApi.addRoutes({
      path: '/v1/purchases/{id}',
      methods: [apigwv2.HttpMethod.GET],
      integration: moviesIntegration,
    });
    httpApi.addRoutes({
      path: '/v1/subscriptions/current',
      methods: [apigwv2.HttpMethod.GET],
      integration: moviesIntegration,
    });
    httpApi.addRoutes({
      path: '/v1/wallets/current',
      methods: [apigwv2.HttpMethod.GET],
      integration: moviesIntegration,
    });
    httpApi.addRoutes({
      path: '/v1/wallets/transactions',
      methods: [apigwv2.HttpMethod.GET],
      integration: moviesIntegration,
    });

    new CfnOutput(this, 'HttpApiUrl', { value: httpApi.apiEndpoint });
    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: appClient.userPoolClientId });
    if (lambdaSg) new CfnOutput(this, 'LambdaSecurityGroupId', { value: lambdaSg.securityGroupId });
  }
}
