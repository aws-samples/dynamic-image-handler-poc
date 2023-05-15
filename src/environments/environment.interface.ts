// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

interface IEnvironment {
	port: number;
	secretKey: string;
	applyEncryption: boolean;
	getCurrentEnvironment(): string;
	setEnvironment(env: string): void;
	isProductionEnvironment(): boolean;
	isDevEnvironment(): boolean;
	isTestEnvironment(): boolean;
	isStagingEnvironment(): boolean;
}

export default IEnvironment;
