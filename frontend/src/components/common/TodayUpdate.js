import React from 'react';

const TodayUpdate = () => {
  const stats = [
    { label: 'New Post', value: '13' },
    { label: 'Total Visitors', value: '480' },
    { label: 'New Subscribers', value: '29' },
    { label: 'Blog Reads', value: '130' }
  ];

  return (
    <div className="grid grid-cols-2 gap-[20px] mb-[60px]">
      {stats.map((stat) => (
        <div key={stat.label} className="p-[25px] flex flex-col justify-center text-center bg-[#dff1f0] rounded-[5px]">
          <p className="font-bold text-[#00aaa1] text-[25px] m-0">{stat.value}</p>
          <p className="text-sm m-0 text-[#555]">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

export default TodayUpdate;
