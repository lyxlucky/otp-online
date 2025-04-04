import React from 'react';
import CardOtpShow from '@/components/CardOtpShow';
import { Skeleton } from 'antd';


export default async function Index() {
  const mockData = [
    {
      title: "中山大学附属第七医院（深圳）",
      secret: 'HA2DOMZRMI2TILLCHFRWMLJUGBRTALLCGVSGILLDGFQTEYRRGYYGIZTCG4',
    }
  ]

  async function fetchData() {
    // if (!res.ok) {
    //   throw new Error('Failed to fetch data');
    // }
    // return res.json();
    return mockData;
    // 使用 mockData 替代实际 API 调用，方便演示
  }

  const data = await fetchData();

  return (
    <>
      <div className="flex gap-6">
        {
          data ? data.map((item, index) => (
            <CardOtpShow key={index} title={item.title} secret={item.secret} />
          )) : <Skeleton active />
        }
      </div>
    </>
  );
}
