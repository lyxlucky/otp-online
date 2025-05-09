import React from 'react';
import CardOtpShow from '@/components/CardOtpShow';
import { Skeleton } from 'antd';


export default async function Index() {
  const mockData = [
    {
      title: "中山大学附属第七医院（深圳）",
      secret: 'GFSDEMBVGRSGGLJQMJTGCLJUGFQTILJYHAZDILJRHE3TSZJSMZRGMNJXMU',
    }
  ]

  async function fetchData() {
    return mockData;
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
