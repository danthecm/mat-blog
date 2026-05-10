import React from "react";

const Footer = () => {
  return (
    <footer className="grid grid-cols-1 items-center justify-center bg-[#f2f8f7]">
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_5fr] gap-y-10 lg:gap-y-0 lg:gap-x-[110px] px-6 py-8 md:px-8 md:py-12 lg:px-16 lg:py-20">
        <div>
          <h3 className="mb-6 font-bold">
            <span className="bg-primary text-[#e8f3f3] px-1 font-bold my-2.5 font-poppins">CM</span>Blog{" "}
          </h3>
          <p className="mb-2.5 text-[15px] leading-relaxed">
            Did you come here for something in particular or just general Riker
          </p>
        </div>

        <div>
          <h3 className="mb-6 font-bold">Blog</h3>
          <p className="mb-2.5 text-[15px] leading-relaxed">Travel</p>
          <p className="mb-2.5 text-[15px] leading-relaxed">Health</p>
          <p className="mb-2.5 text-[15px] leading-relaxed">Design</p>
          <p className="mb-2.5 text-[15px] leading-relaxed">Education</p>
          <p className="mb-2.5 text-[15px] leading-relaxed">Technology</p>
        </div>

        <div>
          <h3 className="mb-6 font-bold">Quick Links</h3>
          <p className="mb-2.5 text-[15px] leading-relaxed">FAQ</p>
          <p className="mb-2.5 text-[15px] leading-relaxed">Terms and Conditions</p>
          <p className="mb-2.5 text-[15px] leading-relaxed">Support</p>
          <p className="mb-2.5 text-[15px] leading-relaxed">Privacy and Policy</p>
        </div>

        <section className="flex flex-col gap-6">
          <div>
            <h3 className="mb-6 font-bold">Subscriber for Newsletter</h3>
            <div className="flex">
              <input 
                type="text" 
                placeholder="Your Email" 
                className="w-full max-w-[250px] h-[45px] text-[#777777] px-5 py-3.5 bg-[#DFF1F0] rounded-l-md border-none focus:outline focus:outline-1 focus:outline-primary"
              />
              <button className="h-[45px] px-10 py-3.5 text-white bg-primary rounded-r-md -ml-[2px] cursor-pointer">
                Subscribe
              </button>
            </div>
          </div>
          <div>
            <h3 className="mb-1 font-bold">Follow on:</h3>
            <div className="flex flex-wrap gap-4 mt-2">
              <button className="bg-transparent border-none cursor-pointer">
                <i className="fa-brands fa-facebook-square p-1.5 text-xl text-[#666]"></i>
              </button>
              <button className="bg-transparent border-none cursor-pointer">
                <i className="fa-brands fa-twitter p-1.5 text-xl text-[#666]"></i>
              </button>
              <button className="bg-transparent border-none cursor-pointer">
                <i className="fa-brands fa-instagram p-1.5 text-xl text-[#666]"></i>
              </button>
              <button className="bg-transparent border-none cursor-pointer">
                <i className="fa-brands fa-pinterest p-1.5 text-xl text-[#666]"></i>
              </button>
            </div>
          </div>
        </section>
      </section>
      <hr className="border-[#D1E7E5] w-full" />
      <p className="text-[12px] text-center m-3.5 text-[#555]">Designed By CM & Developed By DanTheCM</p>
    </footer>
  );
};

export default Footer;
