/**
 * 策略注册中心
 * 管理所有已注册的策略实例
 */

import type { Strategy } from "./strategy.interface.js";
import type { StrategyMetadata } from "./strategy-types.js";

/**
 * 策略注册中心错误
 */
export class StrategyRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StrategyRegistryError";
  }
}

/**
 * 策略注册中心
 * 管理策略的注册、获取、列表等操作
 */
export class StrategyRegistry {
  /** 策略 Map */
  private readonly strategies = new Map<string, Strategy>();

  /** 策略别名 Map */
  private readonly aliases = new Map<string, string>();

  /** 已注册的策略 ID 列表（保持插入顺序） */
  private readonly registeredIds: string[] = [];

  /**
   * 注册一个策略实例
   * @param strategy 策略实例
   * @throws {StrategyRegistryError} 如果策略 ID 已存在
   */
  register(strategy: Strategy): void {
    const metadata = strategy.getMetadata();
    const { id, version } = metadata;

    // 检查 ID 是否已存在
    if (this.strategies.has(id)) {
      throw new StrategyRegistryError(
        `Strategy with ID "${id}" is already registered. ` +
        `Use unregister("${id}") first or use registerOrReplace().`,
      );
    }

    this.strategies.set(id, strategy);
    this.registeredIds.push(id);
  }

  /**
   * 注册或替换策略
   * @param strategy 策略实例
   */
  registerOrReplace(strategy: Strategy): void {
    const metadata = strategy.getMetadata();
    const { id } = metadata;

    if (this.strategies.has(id)) {
      this.strategies.set(id, strategy);
    } else {
      this.registeredIds.push(id);
      this.strategies.set(id, strategy);
    }
  }

  /**
   * 注销策略
   * @param id 策略 ID
   * @returns 是否成功注销
   */
  unregister(id: string): boolean {
    const deleted = this.strategies.delete(id);
    if (deleted) {
      const index = this.registeredIds.indexOf(id);
      if (index !== -1) {
        this.registeredIds.splice(index, 1);
      }
    }
    return deleted;
  }

  /**
   * 获取策略实例
   * @param id 策略 ID 或别名
   * @returns 策略实例，不存在则返回 undefined
   */
  get(id: string): Strategy | undefined {
    // 先尝试直接通过 ID 查找
    let strategy = this.strategies.get(id);

    // 如果没找到，尝试通过别名查找
    if (!strategy) {
      const aliasId = this.aliases.get(id);
      if (aliasId) {
        strategy = this.strategies.get(aliasId);
      }
    }

    return strategy;
  }

  /**
   * 检查策略是否已注册
   * @param id 策略 ID
   */
  has(id: string): boolean {
    return this.strategies.has(id) || this.aliases.has(id);
  }

  /**
   * 获取所有策略实例
   * @returns 策略实例数组
   */
  all(): Strategy[] {
    return this.registeredIds.map((id) => this.strategies.get(id)!);
  }

  /**
   * 获取所有策略元信息
   * @returns 策略元信息数组
   */
  allMetadata(): StrategyMetadata[] {
    return this.registeredIds.map((id) => {
      const strategy = this.strategies.get(id)!;
      return strategy.getMetadata();
    });
  }

  /**
   * 按分类获取策略
   * @param category 策略分类
   */
  getByCategory(category: string): Strategy[] {
    return this.all().filter((strategy) => {
      const metadata = strategy.getMetadata();
      return metadata.category === category;
    });
  }

  /**
   * 添加策略别名
   * @param alias 别名
   * @param strategyId 策略 ID
   */
  addAlias(alias: string, strategyId: string): void {
    if (!this.strategies.has(strategyId)) {
      throw new StrategyRegistryError(
        `Cannot add alias: Strategy "${strategyId}" is not registered.`,
      );
    }
    this.aliases.set(alias, strategyId);
  }

  /**
   * 移除策略别名
   * @param alias 别名
   */
  removeAlias(alias: string): boolean {
    return this.aliases.delete(alias);
  }

  /**
   * 获取已注册策略数量
   */
  get size(): number {
    return this.strategies.size;
  }

  /**
   * 清空所有注册的策略
   */
  clear(): void {
    this.strategies.clear();
    this.aliases.clear();
    this.registeredIds.length = 0;
  }

  /**
   * 创建全局单例注册中心
   */
  static createGlobal(): StrategyRegistry {
    return new StrategyRegistry();
  }
}

/** 全局策略注册中心单例 */
export const globalRegistry = StrategyRegistry.createGlobal();
