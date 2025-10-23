/**
 * 任务状态枚举
 */
export enum TodoStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in-progress',
    COMPLETED = 'completed'
}

/**
 * 任务优先级枚举
 */
export enum TodoPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high'
}

/**
 * 待办事项数据模型
 */
export interface TodoItem {
    /** 唯一标识符（UUID） */
    id: string;
    
    /** 任务标题 */
    title: string;
    
    /** 任务详细描述 */
    description?: string;
    
    /** 任务状态 */
    status: TodoStatus;
    
    /** 优先级 */
    priority: TodoPriority;
    
    /** 创建时间 */
    createdAt: number;
    
    /** 最后更新时间 */
    updatedAt: number;
    
    /** 截止日期 */
    dueDate?: number;
    
    /** 标签列表 */
    tags?: string[];
}

/**
 * 存储数据结构
 */
export interface TodoData {
    /** 任务列表 */
    items: TodoItem[];
    
    /** 数据版本号 */
    version: number;
    
    /** 最后同步时间 */
    lastSync: number;
}

/**
 * 分组方式枚举
 */
export enum GroupBy {
    STATUS = 'status',
    PRIORITY = 'priority',
    NONE = 'none'
}
