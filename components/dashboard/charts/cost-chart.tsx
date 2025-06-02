'use client';

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from 'recharts';

interface CostData {
    date: string;
    cost: number;
}

interface CostChartProps {
    data: CostData[];
    height?: number;
    showArea?: boolean;
    color?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border rounded-lg shadow-lg">
                <p className="text-sm text-gray-600">
                    {new Date(label).toLocaleDateString()}
                </p>
                <p className="text-sm font-medium text-gray-900">
                    Cost: ${payload[0].value.toFixed(2)}
                </p>
            </div>
        );
    }
    return null;
};

export const CostChart: React.FC<CostChartProps> = ({
                                                        data,
                                                        height = 300,
                                                        showArea = false,
                                                        color = '#3B82F6',
                                                    }) => {
    if (!data || data.length === 0) {
        return (
            <div
                className="flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg"
                style={{ height }}
            >
                No data available
            </div>
        );
    }

    const chartData = data.map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        }),
        cost: Number(item.cost.toFixed(2))
    }));

    const Chart = showArea ? AreaChart : LineChart;

    return (
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <Chart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                    />
                    <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                        tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {showArea ? (
                        <Area
                            type="monotone"
                            dataKey="cost"
                            stroke={color}
                            fill={color}
                            fillOpacity={0.1}
                            strokeWidth={2}
                        />
                    ) : (
                        <Line
                            type="monotone"
                            dataKey="cost"
                            stroke={color}
                            strokeWidth={2}
                            dot={{ fill: color, strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
                        />
                    )}
                </Chart>
            </ResponsiveContainer>
        </div>
    );
};

export default CostChart;