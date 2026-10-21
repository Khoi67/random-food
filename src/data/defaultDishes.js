/**
 * BỘ DỮ LIỆU MẪU CHUẨN ẨM THỰC TP. HỒ CHÍ MINH (SÀI GÒN)
 */
export const DEFAULT_DISHES_HCM = [
// ========== BỮA SÁNG TẠI TP.HCM ==========
      {
        id: 'hcm-sang-1',
        name: 'Cơm Tấm Sài Gòn',
        mealTypes: ['sang', 'trua', 'toi'],
        locations: [
          { name: 'Cơm Tấm Ba Ghiền', address: '84 Đặng Văn Ngữ, P.10, Phú Nhuận' },
          { name: 'Cơm Tấm Phúc Lộc Thọ', address: '223 Nguyễn Thị Thập, Tân Phú, Quận 7' },
          { name: 'Cơm Tấm Tú Mập', address: '89-91 Đồng Đen, Phường 12, Tân Bình' },
          { name: 'Cơm Tấm Nguyễn Văn Cừ', address: '167 Nguyễn Văn Cừ, Phường 2, Quận 5' },
          { name: 'Cơm Tấm Bụi Sài Gòn', address: '100 Thạch Thị Thanh, Tân Định, Quận 1' }
        ]
      },
      {
        id: 'hcm-sang-2',
        name: 'Hủ Tiếu Nam Vang',
        mealTypes: ['sang', 'trua', 'toi'],
        locations: [
          { name: 'Hủ Tiếu Nam Vang Nhân Quán', address: '122 Nguyễn Trãi, Phường 3, Quận 5' },
          { name: 'Hủ Tiếu Nam Vang Quỳnh', address: 'A65 Nguyễn Trãi, Cư xá Đô Thành, Quận 1' },
          { name: 'Hủ Tiếu Nam Vang Thành Đạt', address: '34 Cô Bắc, Cầu Ông Lãnh, Quận 1' },
          { name: 'Hủ Tiếu Nam Vang Liến Húa', address: '312 An Dương Vương, Phường 4, Quận 5' }
        ]
      },
      {
        id: 'hcm-sang-3',
        name: 'Bánh Mì Thịt & Chảo',
        mealTypes: ['sang', 'trua'],
        locations: [
          { name: 'Bánh Mì Huỳnh Hoa', address: '26 Lê Thị Riêng, P. Bến Thành, Quận 1' },
          { name: 'Bánh Mì Bảy Hổ', address: '19 Huỳnh Khương Ninh, Đa Kao, Quận 1' },
          { name: 'Bánh Mì Như Lan', address: '50 Hàm Nghi, P. Bến Nghé, Quận 1' },
          { name: 'Bánh Mì Chảo Hòa Mã', address: '53 Cao Thắng, Phường 3, Quận 3' },
          { name: 'Bánh Mì Phá Lấu Bà 6', address: '104 Hoàng Diệu, Phường 12, Quận 4' }
        ]
      },
      {
        id: 'hcm-sang-4',
        name: 'Bún Bò Huế Sài Gòn',
        mealTypes: ['sang', 'trua'],
        locations: [
          { name: 'Bún Bò Huế Út Hưng', address: '113 Bà Huyện Thanh Quan, Võ Thị Sáu, Quận 3' },
          { name: 'Bún Bò Huế Đông Ba', address: '207 Nguyễn Trãi, P. Nguyễn Cư Trinh, Quận 1' },
          { name: 'Bún Bò Ba Nghị', address: '45 Lê Văn Sỹ, Phường 13, Phú Nhuận' },
          { name: 'Bún Bò Gánh', address: '88 Hồ Tùng Mậu, Bến Nghé, Quận 1' }
        ]
      },
      {
        id: 'hcm-sang-5',
        name: 'Phở Bò Sài Gòn',
        mealTypes: ['sang', 'trua', 'toi'],
        locations: [
          { name: 'Phở Lệ', address: '415 Nguyễn Trãi, Phường 7, Quận 5' },
          { name: 'Phở Hòa Pasteur', address: '260C Pasteur, Phường 8, Quận 3' },
          { name: 'Phở Phú Vương', address: '120 Nguyễn Thái Bình, Quận 1' },
          { name: 'Phở Thìn Sài Gòn', address: '110 Hai Bà Trưng, Đa Kao, Quận 1' }
        ]
      },
      {
        id: 'hcm-sang-6',
        name: 'Bò Né Bánh Mì',
        mealTypes: ['sang'],
        locations: [
          { name: 'Bò Né Lệ Hồng', address: '489/29 Huỳnh Văn Bánh, Phường 13, Phú Nhuận' },
          { name: 'Bò Né Cô Long', address: '27/53 Nguyễn Bỉnh Khiêm, Đa Kao, Quận 1' },
          { name: 'Bò Né 3 Ngon', address: '18 Đinh Tiên Hoàng, Đa Kao, Quận 1' }
        ]
      },
      {
        id: 'hcm-sang-7',
        name: 'Bánh Canh Cua & Giò Heo',
        mealTypes: ['sang', 'trua', 'toi'],
        locations: [
          { name: 'Bánh Canh Cua Út Lệ', address: '210 Tô Hiến Thành, Phường 15, Quận 10' },
          { name: 'Bánh Canh Cua Hoàng Lan', address: '484 Vĩnh Viễn, Phường 8, Quận 10' },
          { name: 'Bánh Canh Cua Trần Khắc Chân', address: '87 Trần Khắc Chân, Tân Định, Quận 1' },
          { name: 'Bánh Canh Giò Heo 144', address: '144 Nguyễn Tri Phương, Phường 9, Quận 5' }
        ]
      },
      {
        id: 'hcm-sang-8',
        name: 'Dimsum & Hủ Tiếu Mì Q.5',
        mealTypes: ['sang', 'trua'],
        locations: [
          { name: 'Tiến Phát Điểm Sâm Quán', address: '18 Ký Hòa, Phường 15, Quận 5' },
          { name: 'Baoz Dimsum', address: '88 Nguyễn Tri Phương, Phường 7, Quận 5' },
          { name: 'Hủ Tiếu Mì Thiệu Ký', address: '66/5 Lê Đại Hành, Phường 7, Quận 11' },
          { name: 'Hủ Tiếu Sa Tế Quảng Ký', address: '117 Triệu Quang Phục, Phường 11, Quận 5' }
        ]
      },
      {
        id: 'hcm-sang-9',
        name: 'Xôi Mặn & Xôi Gà',
        mealTypes: ['sang', 'toi'],
        locations: [
          { name: 'Xôi Gà Bà Chiểu', address: '318/1 Bùi Hữu Nghĩa, Phường 2, Bình Thạnh' },
          { name: 'Xôi Bát Bửu Chợ Lớn', address: '223 Nguyễn Trãi, Phường 2, Quận 5' },
          { name: 'Xôi Mặn Cô Lan', address: '280 Bùi Hữu Nghĩa, Phường 2, Bình Thạnh' }
        ]
      },

      // ========== BỮA TRƯA TẠI TP.HCM ==========
      {
        id: 'hcm-trua-1',
        name: 'Bún Thịt Nướng & Chả Giò',
        mealTypes: ['trua', 'toi'],
        locations: [
          { name: 'Bún Thịt Nướng Chị Tuyền', address: '175 Cô Giang, Phường Cô Giang, Quận 1' },
          { name: 'Bún Thịt Nướng Hải Mập', address: '149/1 Nguyễn Tri Phương, Phường 8, Quận 5' },
          { name: 'Bún Thịt Nướng Kiều Bảo', address: '139 Đề Thám, Phường Cô Giang, Quận 1' },
          { name: 'Bún Thịt Nướng Hoàng Văn', address: '137 Chấn Hưng, Phường 6, Tân Bình' }
        ]
      },
      {
        id: 'hcm-trua-2',
        name: 'Bún Đậu Mắm Tôm',
        mealTypes: ['trua', 'toi'],
        locations: [
          { name: 'Bún Đậu A Chảnh', address: '367 Thành Thái, Phường 14, Quận 10' },
          { name: 'Bún Đậu Mạc Văn Khoa', address: '253 Phan Xích Long, Phường 7, Phú Nhuận' },
          { name: 'Bún Đậu Homemade', address: '1 Nguyễn Văn Tráng, Bến Thành, Quận 1' },
          { name: 'Bún Đậu Cống Quỳnh', address: '153/1 Cống Quỳnh, Nguyễn Cư Trinh, Quận 1' }
        ]
      },
      {
        id: 'hcm-trua-3',
        name: 'Cơm Niêu Sài Gòn',
        mealTypes: ['trua', 'toi'],
        locations: [
          { name: 'Cơm Niêu Sài Gòn Tú Xương', address: '27 Tú Xương, Phường 7, Quận 3' },
          { name: 'Cơm Niêu Thiên Lý', address: '120 Cao Thắng, Phường 4, Quận 3' },
          { name: 'Cơm Niêu Panda', address: '200 Nguyễn Thị Thập, Bình Thuận, Quận 7' }
        ]
      },
      {
        id: 'hcm-trua-4',
        name: 'Cơm Gà Xối Mỡ',
        mealTypes: ['trua', 'toi'],
        locations: [
          { name: 'Cơm Gà Xối Mỡ 142', address: '142 Ba Đình, Phường 10, Quận 8' },
          { name: 'Cơm Gà Xối Mỡ Su Su', address: '117/14 Cống Quỳnh, Nguyễn Cư Trinh, Quận 1' },
          { name: 'Cơm Gà Lão Hương Thân', address: '402 Trần Phú, Phường 7, Quận 5' }
        ]
      },
      {
        id: 'hcm-trua-5',
        name: 'Bún Mắm Miền Tây',
        mealTypes: ['trua', 'toi'],
        locations: [
          { name: 'Bún Mắm 173 Cô Giang', address: '173 Cô Giang, Phường Cô Giang, Quận 1' },
          { name: 'Bún Mắm 444', address: '375 Lê Quang Định, Phường 5, Bình Thạnh' },
          { name: 'Bún Mắm Sáu Kèn', address: 'Hẻm 412 Châu Văn Liêm, Phường 14, Quận 5' }
        ]
      },
      {
        id: 'hcm-trua-6',
        name: 'Bánh Xèo & Bánh Khọt',
        mealTypes: ['trua', 'toi'],
        locations: [
          { name: 'Bánh Xèo Ăn Là Ghiền', address: '74 Sương Nguyệt Ánh, Bến Thành, Quận 1' },
          { name: 'Bánh Khọt Cô Ba Vũng Tàu', address: '102 Cao Thắng, Phường 4, Quận 3' },
          { name: 'Bánh Xèo Tôm Nhảy Cô Ba', address: '76 Nguyễn Thị Thập, Tân Hưng, Quận 7' }
        ]
      },
      {
        id: 'hcm-trua-7',
        name: 'Bún Chả Sài Gòn',
        mealTypes: ['trua'],
        locations: [
          { name: 'Bún Chả Ánh Hồng', address: '140b Lý Chính Thắng, Phường 7, Quận 3' },
          { name: 'Bún Chả Hoa Đông', address: '121 Lý Tự Trọng, P. Bến Thành, Quận 1' },
          { name: 'Bún Chả Hồ Gươm', address: '135 Võ Văn Tần, Phường 6, Quận 3' }
        ]
      },
      {
        id: 'hcm-trua-8',
        name: 'Cơm Thố Chợ Lớn',
        mealTypes: ['trua', 'toi'],
        locations: [
          { name: 'Cơm Thố Chuyên Ký', address: '65 Tôn Thất Đạm, Bến Nghé, Quận 1' },
          { name: 'Tân Nhã Quán', address: '100 Trần Hưng Đạo B, Phường 7, Quận 5' },
          { name: 'Quán Triều Châu', address: '355 An Dương Vương, Phường 3, Quận 5' }
        ]
      },

      // ========== CHIỀU / TỐI TẠI TP.HCM ==========
      {
        id: 'hcm-toi-1',
        name: 'Ốc & Hải Sản Sài Gòn',
        mealTypes: ['toi'],
        locations: [
          { name: 'Ốc Đào Nguyễn Trãi', address: '212B/C79 Nguyễn Trãi, Nguyễn Cư Trinh, Quận 1' },
          { name: 'Ốc Oanh Vĩnh Khánh', address: '534 Vĩnh Khánh, Phường 8, Quận 4' },
          { name: 'Ốc Khánh', address: '25/5 Nguyễn Bỉnh Khiêm, P. Bến Nghé, Quận 1' },
          { name: 'Ốc Như', address: '650/4/29 Điện Biên Phủ, Phường 11, Quận 10' },
          { name: 'Ốc Nho Quận 4', address: '178 Lê Quốc Hưng, Phường 12, Quận 4' }
        ]
      },
      {
        id: 'hcm-toi-2',
        name: 'Lẩu Bò Sài Gòn',
        mealTypes: ['toi'],
        locations: [
          { name: 'Lẩu Bò Hoàng Thu Hồ Thị Kỷ', address: '84/1 Hồ Thị Kỷ, Phường 1, Quận 10' },
          { name: 'Lẩu Bò Cô Thảo', address: 'Hẻm 84 Hồ Thị Kỷ, Phường 1, Quận 10' },
          { name: 'Lẩu Bò Tí Chuột', address: '1-3 Cao Bá Nhạ, Nguyễn Cư Trinh, Quận 1' },
          { name: 'Lẩu Bò Nghĩa Địa Gò Vấp', address: '498/41 Lê Quang Định, Phường 1, Gò Vấp' }
        ]
      },
      {
        id: 'hcm-toi-3',
        name: 'Lẩu Dê & Dê Nướng',
        mealTypes: ['toi'],
        locations: [
          { name: 'Lẩu Dê 404', address: '436 Nguyễn Thị Thập, Tân Quy, Quận 7' },
          { name: 'Lẩu Dê Trương Định', address: '105 Trương Định, Phường 6, Quận 3' },
          { name: 'Lẩu Dê Đồng Quê', address: '217 Nguyễn Hồng Đào, Phường 14, Tân Bình' }
        ]
      },
      {
        id: 'hcm-toi-4',
        name: 'Phá Lấu Bò & Bánh Mì',
        mealTypes: ['trua', 'toi'],
        locations: [
          { name: 'Phá Lấu Bò Cô Thảo Q.4', address: '243/29G Tôn Đản, Phường 15, Quận 4' },
          { name: 'Phá Lấu Bò Dũng', address: '90 Ba Đình, Phường 10, Quận 8' },
          { name: 'Phá Lấu Bò Chợ Bàn Cờ', address: '51/24B Cao Thắng, Phường 3, Quận 3' },
          { name: 'Phá Lấu Bò Marie Curie', address: '433/44 Lê Đại Hành, Phường 11, Quận 11' }
        ]
      },
      {
        id: 'hcm-toi-5',
        name: 'Gà Nướng Muối Ớt',
        mealTypes: ['toi'],
        locations: [
          { name: 'Gà Nướng Cái Bang', address: '48/40 Hồ Biểu Chánh, Phường 11, Phú Nhuận' },
          { name: 'Gà Nướng Ò Ó O', address: '212 Nguyễn Hồng Đào, Phường 14, Tân Bình' },
          { name: 'Gà Nướng Việt Hương', address: '449A Trần Phú, Phường 7, Quận 5' }
        ]
      },
      {
        id: 'hcm-toi-6',
        name: 'Lẩu Haidilao Hotpot',
        mealTypes: ['trua', 'toi'],
        locations: [
          { name: 'Haidilao Vincom Đồng Khởi', address: '72 Lê Thánh Tôn, Bến Nghé, Quận 1' },
          { name: 'Haidilao Landmark 81', address: '720A Điện Biên Phủ, Phường 22, Bình Thạnh' },
          { name: 'Haidilao Vạn Hạnh Mall', address: '11 Sư Vạn Hạnh, Phường 12, Quận 10' }
        ]
      },
      {
        id: 'hcm-toi-7',
        name: "Pizza 4P's Sài Gòn",
        mealTypes: ['trua', 'toi'],
        locations: [
          { name: "Pizza 4P's Lê Thánh Tôn", address: '8/15 Lê Thánh Tôn, Bến Nghé, Quận 1' },
          { name: "Pizza 4P's Hai Bà Trưng", address: '151 Hai Bà Trưng, Phường 6, Quận 3' },
          { name: "Pizza 4P's Saigon Pearl", address: '92 Nguyễn Hữu Cảnh, Phường 22, Bình Thạnh' }
        ]
      },
      {
        id: 'hcm-toi-8',
        name: 'Bò Tơ Củ Chi',
        mealTypes: ['toi'],
        locations: [
          { name: 'Bò Tơ Quán Mộc', address: '43-45 Nguyễn Thị Thập, Tân Hưng, Quận 7' },
          { name: 'Bò Tơ Năm Sánh', address: '86B Phạm Hùng, Bình Hưng, Bình Chánh' },
          { name: 'Bò Tơ Củ Chi Xuân Đào', address: 'Khu phố 2, QL22, Củ Chi, TP.HCM' }
        ]
      },
      {
        id: 'hcm-toi-9',
        name: 'Ăn Vặt Bánh Tráng Trộn',
        mealTypes: ['toi'],
        locations: [
          { name: 'Bánh Tráng Trộn Chú Viên', address: '38 Nguyễn Thượng Hiền, Phường 5, Quận 3' },
          { name: 'Bánh Tráng Nướng Hồ Con Rùa', address: 'Công Trường Quốc Tế, Phường 6, Quận 3' },
          { name: 'Ăn Vặt Hẻm 20 Thước', address: 'Bến Vân Đồn, Phường 9, Quận 4' },
          { name: 'Bánh Tráng Cuốn Bà Bắc', address: '40/11 Trần Văn Đang, Phường 9, Quận 3' }
        ]
      },
      {
        id: 'hcm-toi-10',
        name: 'Chè Mâm & Chè Chợ Lớn',
        mealTypes: ['toi'],
        locations: [
          { name: 'Chè Hà Ký', address: '138 Châu Văn Liêm, Phường 11, Quận 5' },
          { name: 'Chè Mâm Khánh Vy', address: '242B Sư Vạn Hạnh, Phường 2, Quận 10' },
          { name: 'Chè Tường Phong', address: '83 An Điềm, Phường 10, Quận 5' }
        ]
      },
      {
        id: 'hcm-chay-1',
        name: 'Cơm Chay & Hủ Tiếu Chay',
        mealTypes: ['sang', 'trua', 'toi'],
        priceRange: 'under50',
        type: 'nuoc',
        vegetarian: true,
        tags: ['chay', 'món nước', 'thanh đạm'],
        locations: [
          { name: 'Cơm Chay Giác Ngộ', address: '213 Hùng Vương, Phường 9, Quận 5' },
          { name: 'Hủ Tiếu Chay Cây Bồ Đề', address: '360D Bến Vân Đồn, Phường 1, Quận 4' },
          { name: 'Ẩm Thực Chay Mani', address: '291/2 Võ Văn Tần, Phường 5, Quận 3' },
          { name: 'Quán Chay Pháp Hoa', address: '219 Thích Quảng Đức, Phường 4, Phú Nhuận' }
        ]
      },
      {
        id: 'hcm-chay-2',
        name: 'Lẩu Nấm & Đậu Hũ Chay',
        mealTypes: ['trua', 'toi'],
        priceRange: '50to100',
        type: 'nuoc',
        vegetarian: true,
        tags: ['chay', 'lẩu', 'thanh tịnh'],
        locations: [
          { name: 'Lẩu Nấm Chay An Nhiên', address: '81-83 Phạm Ngũ Lão, Phường 3, Gò Vấp' },
          { name: 'Nhà Hàng Chay Rôu', address: '37B Cô Bắc, Cầu Ông Lãnh, Quận 1' },
          { name: 'Chay Mandala', address: '110 Sương Nguyệt Ánh, Bến Thành, Quận 1' }
        ]
      }
];

