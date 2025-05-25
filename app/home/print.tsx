'use client'
import { useRef } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface IProduct {
    stt: number
    name: string
    unit: string
    expiryDate: string
    price: number
    quantity: number
    total: number
}

interface ICompany {
    name: string
    address: string
    phone: string
    invoiceNumber: string
    date: string
}

// Hàm xử lý in PDF
export const usePrintInvoice = (invoiceRef: React.RefObject<HTMLDivElement | null>, fileName = 'hoa-don.pdf') => {
    const printInvoice = async () => {
        if (!invoiceRef.current) return

        try {
            const canvas = await html2canvas(invoiceRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            })

            const imgWidth = 210
            const pageHeight = 297
            const imgHeight = (canvas.height * imgWidth) / canvas.width
            let heightLeft = imgHeight
            let position = 0

            const pdf = new jsPDF('p', 'mm', 'a4')
            const imgData = canvas.toDataURL('image/png')

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
            heightLeft -= pageHeight

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight
                pdf.addPage()
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
                heightLeft -= pageHeight
            }

            pdf.save(fileName)
        } catch (error) {
            console.error('Lỗi khi tạo PDF:', error)
        }
    }

    return { printInvoice }
}

// Component chính để in hóa đơn
export const InvoicePrint = ({ company, products, title = 'PHIẾU NHẬP KHO' }: {
    company: ICompany
    products: IProduct[]
    title?: string
}) => {
    const invoiceRef = useRef<HTMLDivElement>(null)
    const { printInvoice } = usePrintInvoice(invoiceRef)

    const totalQuantity = products.reduce((sum, item) => sum + item.quantity, 0)
    const totalAmount = products.reduce((sum, item) => sum + item.total, 0)

    return (
        <div className="space-y-4">
            <button
                onClick={printInvoice}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center"
            >

                In hóa đơn
            </button>

            <div ref={invoiceRef} className="bg-white p-4 rounded-xl shadow-xl border border-gray-100">
                <div className="w-full space-y-4 px-8">

                    <div className="flex justify-between items-start border-b-2 border-gray-300 pb-2">
                        <div className="space-y-1">
                            <p className="font-bold text-xl text-gray-900">{company.name}</p>
                            <p className="text-gray-700">{company.address}</p>
                            <p className="text-gray-700">Hotline: {company.phone}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="font-medium text-gray-700">Số phiếu: <span className="text-gray-900 font-bold">{company.invoiceNumber}</span></p>
                            <p className="text-gray-700">Ngày: {company.date}</p>
                        </div>
                    </div>

                    <div className="text-center py-2 border-b-2 border-gray-300">
                        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                    </div>

                    <div className="overflow-x-auto border-2 border-gray-300 rounded-lg">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="py-2 px-3 text-left font-bold text-gray-900 border-y-2 border-gray-300 w-[5%]">STT</th>
                                    <th className="py-2 px-3 text-left font-bold text-gray-900 border-y-2 border-gray-300 w-[30%]">Tên sản phẩm</th>
                                    <th className="py-2 px-3 text-left font-bold text-gray-900 border-y-2 border-gray-300 w-[10%]">Đơn vị</th>
                                    <th className="py-2 px-3 text-left font-bold text-gray-900 border-y-2 border-gray-300 w-[15%]">Ngày hết hạn</th>
                                    <th className="py-2 px-3 text-right font-bold text-gray-900 border-y-2 border-gray-300 w-[15%]">Giá</th>
                                    <th className="py-2 px-3 text-right font-bold text-gray-900 border-y-2 border-gray-300 w-[10%]">Số lượng</th>
                                    <th className="py-2 px-3 text-right font-bold text-gray-900 border-y-2 border-gray-300 w-[15%]">Tổng tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                        <td className="py-2 px-3 border-b-2 border-gray-300 text-gray-700 font-medium">{item.stt}</td>
                                        <td className="py-2 px-3 border-b-2 border-gray-300 text-gray-900 font-medium">{item.name}</td>
                                        <td className="py-2 px-3 border-b-2 border-gray-300 text-gray-700 font-medium">{item.unit}</td>
                                        <td className="py-2 px-3 border-b-2 border-gray-300 text-gray-700 font-medium">{item.expiryDate}</td>
                                        <td className="py-2 px-3 text-right border-b-2 border-gray-300 text-gray-700 font-medium">{item.price.toLocaleString()}</td>
                                        <td className="py-2 px-3 text-right border-b-2 border-gray-300 text-gray-700 font-medium">{item.quantity}</td>
                                        <td className="py-2 px-3 text-right border-b-2 border-gray-300 font-bold text-gray-900">{item.total.toLocaleString()} đ</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-100">
                                    <td colSpan={5} className="py-2 px-3 font-bold text-gray-900 border-t-2 border-gray-300">Tổng cộng</td>
                                    <td className="py-2 px-3 text-right font-bold text-gray-900 border-t-2 border-gray-300">{totalQuantity}</td>
                                    <td className="py-2 px-3 text-right font-bold text-gray-900 border-t-2 border-gray-300">{totalAmount.toLocaleString()} đ</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-8 mt-8 border-t-2 border-gray-300">
                        <div className="text-center">
                            <p className="font-bold text-gray-900 mb-2">NGƯỜI NHẬN</p>
                            <p className="text-sm text-gray-500">(Ký, ghi rõ họ tên)</p>
                            <div className="h-24"></div>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-gray-900 mb-2">NGƯỜI GIAO</p>
                            <p className="text-sm text-gray-500">(Ký, ghi rõ họ tên)</p>
                            <div className="h-24"></div>
                        </div>
                    </div>


                    <div className="text-right text-gray-700 pt-4">
                        <p className="font-bold">Tp.Hồ Chí Minh, {company.date}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const TestInvoice = () => {
    const company = {
        name: "CÔNG TY TNHH RETAILSTORE",
        address: "294/23/513 Phạm Văn Đồng Q.Bình Thạnh Tp.HCM",
        phone: "0369445470",
        invoiceNumber: "24312/4007",
        date: new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    }

    const products = [
        {
            stt: 1,
            name: 'Lốc nước tăng lực Redbull 250ml',
            unit: 'Lốc',
            expiryDate: '12/10/2027',
            price: 50000,
            quantity: 200,
            total: 10000000
        },
        {
            stt: 2,
            name: 'Lốc nước tăng lực Redbull 250ml',
            unit: 'Lốc',
            expiryDate: '12/10/2027',
            price: 50000,
            quantity: 200,
            total: 10000000
        }
    ]

    return <InvoicePrint company={company} products={products} />
}